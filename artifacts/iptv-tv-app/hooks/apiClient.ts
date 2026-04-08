/**
 * Unified API Client
 * - TTL-based cache per data type
 * - Request deduplication (pending promise reuse)
 * - Stale-while-revalidate
 * - Retry + timeout
 * - Debug logging
 */

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "http://localhost:8080");

// ── TTL config (ms) ─────────────────────────────────────
const TTL: Record<string, number> = {
  categories:    30 * 60 * 1000,   // 30 min
  streams:       10 * 60 * 1000,   // 10 min
  home:          10 * 60 * 1000,   // 10 min
  episodes:      30 * 60 * 1000,   // 30 min
  account:        2 * 60 * 1000,   //  2 min
  notifications:  1 * 60 * 1000,   //  1 min
};
const DEFAULT_TTL = 10 * 60 * 1000;
const FETCH_TIMEOUT = 15_000;

function getTtl(url: string): number {
  if (url.includes("/categories"))    return TTL.categories;
  if (url.includes("/home"))          return TTL.home;
  if (url.includes("/episodes"))      return TTL.episodes;
  if (url.includes("/notifications")) return TTL.notifications;
  if (url.includes("/account") || url.includes("/subscription")) return TTL.account;
  if (url.includes("/streams") || url.includes("/list") || url.includes("/series/list")) return TTL.streams;
  return DEFAULT_TTL;
}

// ── In-memory store ─────────────────────────────────────
interface CacheEntry { data: any; ts: number; stale: boolean }
const CACHE = new Map<string, CacheEntry>();
const PENDING = new Map<string, Promise<any>>();
let fetchCount = 0;

function log(msg: string) {
  if (__DEV__) console.log(`[API] ${msg}`);
}

// ── Core fetch ───────────────────────────────────────────
/** Returns raw JSON (full object, no extraction) */
async function netFetchRaw(url: string, attempt = 1): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e: any) {
    clearTimeout(timer);
    if (attempt < 2 && !ctrl.signal.aborted) {
      await new Promise(r => setTimeout(r, 800));
      return netFetchRaw(url, attempt + 1);
    }
    throw e;
  }
}

/** Returns j.data ?? j (simplified for non-paginated use) */
async function netFetch(url: string, attempt = 1): Promise<any> {
  const raw = await netFetchRaw(url, attempt);
  return raw.data ?? raw;
}

// ── Public API ───────────────────────────────────────────

/**
 * Fetch with full caching, deduplication, and stale-while-revalidate.
 * Returns cached data immediately if fresh. Revalidates in background if stale.
 */
export async function apiFetch<T = any>(url: string, force = false): Promise<T> {
  const ttl = getTtl(url);
  const now = Date.now();
  const entry = CACHE.get(url);

  // ① Fresh cache hit → return immediately
  if (!force && entry && now - entry.ts < ttl) {
    log(`CACHE HIT (fresh) → ${url}`);
    return entry.data as T;
  }

  // ② Stale cache → return stale data + trigger background revalidation
  if (!force && entry && entry.data !== undefined) {
    log(`CACHE HIT (stale, revalidating) → ${url}`);
    if (!PENDING.has(url)) {
      const p = netFetch(url)
        .then(data => { CACHE.set(url, { data, ts: Date.now(), stale: false }); PENDING.delete(url); return data; })
        .catch(() => { PENDING.delete(url); });
      PENDING.set(url, p);
    }
    return entry.data as T;
  }

  // ③ Deduplication — reuse in-flight promise
  if (PENDING.has(url)) {
    log(`DEDUP (reusing in-flight) → ${url}`);
    return PENDING.get(url)! as Promise<T>;
  }

  // ④ Network fetch
  fetchCount++;
  log(`NETWORK FETCH #${fetchCount} → ${url}${force ? " (forced)" : ""}`);
  const p = netFetch(url).then((data: T) => {
    CACHE.set(url, { data, ts: Date.now(), stale: false });
    PENDING.delete(url);
    log(`FETCH COMPLETE → ${url}`);
    return data;
  }).catch((e: any) => {
    PENDING.delete(url);
    if (entry) {
      log(`FETCH FAILED, using stale → ${url}`);
      return entry.data as T;
    }
    throw e;
  });

  PENDING.set(url, p);
  return p;
}

/**
 * Like apiFetch but returns the FULL JSON response (not just .data).
 * Use for paginated endpoints that return { data, total, offset, limit }.
 */
export async function apiFetchPaged<T = any>(url: string, force = false): Promise<{ data: T[]; total: number; offset: number; limit: number }> {
  const ttl = getTtl(url);
  const now = Date.now();
  const entry = CACHE.get(url);
  const key = "__paged__" + url;
  const rawEntry = CACHE.get(key);

  if (!force && rawEntry && now - rawEntry.ts < ttl) {
    log(`CACHE HIT paged (fresh) → ${url}`);
    return rawEntry.data;
  }
  if (!force && rawEntry) {
    log(`CACHE HIT paged (stale, revalidating) → ${url}`);
    if (!PENDING.has(key)) {
      const p = netFetchRaw(url)
        .then((j: any) => {
          const list = j.data || [];
          const result = { data: list, total: j.total ?? list.length, offset: j.offset || 0, limit: j.limit || 0 };
          CACHE.set(key, { data: result, ts: Date.now(), stale: false });
          PENDING.delete(key);
          return result;
        })
        .catch(() => { PENDING.delete(key); });
      PENDING.set(key, p);
    }
    return rawEntry.data;
  }
  if (PENDING.has(key)) return PENDING.get(key)!;

  fetchCount++;
  log(`NETWORK FETCH paged #${fetchCount} → ${url}`);
  const p = netFetchRaw(url).then((j: any) => {
    const list = j.data || [];
    const result = { data: list, total: j.total ?? list.length, offset: j.offset || 0, limit: j.limit || 0 };
    CACHE.set(key, { data: result, ts: Date.now(), stale: false });
    CACHE.set(url, { data: result.data, ts: Date.now(), stale: false });
    PENDING.delete(key);
    return result;
  }).catch((e: any) => {
    PENDING.delete(key);
    if (rawEntry) return rawEntry.data;
    if (entry) return { data: entry.data, total: entry.data?.length || 0, offset: 0, limit: 0 };
    throw e;
  });
  PENDING.set(key, p);
  return p;
}

/** Invalidate a cached URL (force next call to re-fetch) */
export function invalidateCache(url: string) {
  CACHE.delete(url);
  log(`CACHE INVALIDATED → ${url}`);
}

/** Invalidate all cache entries matching a pattern */
export function invalidateCachePattern(pattern: string) {
  for (const key of CACHE.keys()) {
    if (key.includes(pattern)) { CACHE.delete(key); }
  }
  log(`CACHE INVALIDATED pattern → ${pattern}`);
}

/** How many network fetches happened (debug) */
export function getFetchCount() { return fetchCount; }
