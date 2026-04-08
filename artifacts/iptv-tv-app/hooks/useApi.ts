import { useState, useEffect, useRef, useCallback } from "react";
import { addToRecentlyWatchedStorage, loadRecentlyWatched } from "./storage";
import { apiFetch, API_BASE as _API_BASE } from "./apiClient";

export { API_BASE } from "./apiClient";

// ── Types ────────────────────────────────────────────────
export interface Category {
  category_id: string;
  category_name: string;
}

export interface StreamItem {
  stream_id?: number;
  series_id?: number;
  name: string;
  stream_icon?: string;
  cover?: string;
  rating?: string | number;
  container_extension?: string;
  category_id?: string;
  num?: number;
  added?: string;
  _tab?: string;
}

export interface SeriesInfo {
  info?: { name?: string; cover?: string; plot?: string; backdrop_path?: string[] };
  seasons?: Record<string, { episodes?: Episode[] }>;
  episodes?: Record<string, Episode[]>;
}

export interface Episode {
  id: string;
  title?: string;
  episode_num?: number;
  season?: number;
  container_extension?: string;
  info?: { movie_image?: string; plot?: string; duration?: string };
}

export type ContentTab = "home" | "live" | "movies" | "series";

// ── Stream URLs ──────────────────────────────────────────
export function getStreamUrl(item: StreamItem, tab: ContentTab): string {
  const id = item.stream_id ?? item.series_id;
  if (tab === "live")   return `${_API_BASE}/api/proxy/live/${id}?format=m3u8`;
  if (tab === "movies") return `${_API_BASE}/api/proxy/movie/${id}?ext=${item.container_extension || "mp4"}`;
  return `${_API_BASE}/api/proxy/series/${id}?ext=${item.container_extension || "mkv"}`;
}

export function getEpisodeStreamUrl(episodeId: string, ext = "mkv"): string {
  return `${_API_BASE}/api/proxy/series/${episodeId}?ext=${ext}`;
}

// ── Core hook — uses apiFetch (cache + dedupe + stale-while-revalidate) ──
export function useApiFetch<T>(url: string, skip = false) {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError]     = useState<string | null>(null);
  const mountedRef             = useRef(true);

  const load = useCallback(
    async (force = false) => {
      if (skip) return;
      if (!force && data !== null) {
        // stale-while-revalidate: trigger background refresh via apiFetch
        apiFetch<T>(url, false).then(d => {
          if (mountedRef.current && d !== data) setData(d);
        }).catch(() => {});
        return;
      }
      if (force) setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<T>(url, force);
        if (mountedRef.current) setData(result);
      } catch (e: any) {
        if (mountedRef.current) setError(e.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, skip],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (skip) { setLoading(false); return; }
    setLoading(true);
    apiFetch<T>(url, false)
      .then(d => { if (mountedRef.current) { setData(d); setLoading(false); } })
      .catch(e => { if (mountedRef.current) { setError(e.message); setLoading(false); } });
    return () => { mountedRef.current = false; };
    // Only re-run when url or skip changes — NOT on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, skip]);

  const reload = useCallback(() => load(true), [load]);
  return { data, loading, error, reload };
}

// ── Recently watched ─────────────────────────────────────
export async function addToRecentlyWatched(item: StreamItem) {
  await addToRecentlyWatchedStorage(item);
}

export async function getRecentlyWatched(): Promise<StreamItem[]> {
  return loadRecentlyWatched();
}
