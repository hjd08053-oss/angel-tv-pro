import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StreamItem } from "./useApi";

/* ── Device ID ──────────────────────────────────────────────── */
let _deviceId: string | null = null;
export async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  let id = await AsyncStorage.getItem("device_id");
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    await AsyncStorage.setItem("device_id", id);
  }
  _deviceId = id;
  return id;
}

/* ── Recently Watched (persistent) ─────────────────────────── */
const RECENTLY_KEY = "recently_watched_v2";
let _recentlyWatched: StreamItem[] | null = null;

export async function loadRecentlyWatched(): Promise<StreamItem[]> {
  if (_recentlyWatched !== null) return _recentlyWatched;
  try {
    const raw = await AsyncStorage.getItem(RECENTLY_KEY);
    _recentlyWatched = raw ? JSON.parse(raw) : [];
  } catch {
    _recentlyWatched = [];
  }
  return _recentlyWatched!;
}

export async function addToRecentlyWatchedStorage(item: StreamItem): Promise<void> {
  const list = await loadRecentlyWatched();
  const idx = list.findIndex(i => (i.stream_id ?? i.series_id) === (item.stream_id ?? item.series_id));
  if (idx !== -1) list.splice(idx, 1);
  list.unshift(item);
  if (list.length > 50) list.pop();
  _recentlyWatched = list;
  await AsyncStorage.setItem(RECENTLY_KEY, JSON.stringify(list));
}

/* ── Watchlist ──────────────────────────────────────────────── */
const WATCHLIST_KEY = "watchlist_v1";
let _watchlist: StreamItem[] | null = null;

export async function loadWatchlist(): Promise<StreamItem[]> {
  if (_watchlist !== null) return _watchlist;
  try {
    const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
    _watchlist = raw ? JSON.parse(raw) : [];
  } catch {
    _watchlist = [];
  }
  return _watchlist!;
}

export async function addToWatchlist(item: StreamItem): Promise<void> {
  const list = await loadWatchlist();
  const exists = list.some(i => (i.stream_id ?? i.series_id) === (item.stream_id ?? item.series_id));
  if (!exists) {
    list.unshift(item);
    _watchlist = list;
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  }
}

export async function removeFromWatchlist(id: number | undefined): Promise<void> {
  if (!id) return;
  const list = await loadWatchlist();
  const filtered = list.filter(i => (i.stream_id ?? i.series_id) !== id);
  _watchlist = filtered;
  await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(filtered));
}

export async function isInWatchlist(id: number | undefined): Promise<boolean> {
  if (!id) return false;
  const list = await loadWatchlist();
  return list.some(i => (i.stream_id ?? i.series_id) === id);
}

/* ── Watch Counts (Most Watched) ────────────────────────────── */
const WATCH_COUNTS_KEY = "watch_counts_v1";
const WATCH_ITEMS_KEY = "watch_items_v1";
let _watchCounts: Record<string, number> | null = null;
let _watchItems: Record<string, StreamItem> | null = null;

async function loadWatchCounts(): Promise<Record<string, number>> {
  if (_watchCounts !== null) return _watchCounts;
  try {
    const raw = await AsyncStorage.getItem(WATCH_COUNTS_KEY);
    _watchCounts = raw ? JSON.parse(raw) : {};
  } catch {
    _watchCounts = {};
  }
  return _watchCounts!;
}

async function loadWatchItems(): Promise<Record<string, StreamItem>> {
  if (_watchItems !== null) return _watchItems;
  try {
    const raw = await AsyncStorage.getItem(WATCH_ITEMS_KEY);
    _watchItems = raw ? JSON.parse(raw) : {};
  } catch {
    _watchItems = {};
  }
  return _watchItems!;
}

export async function incrementWatchCount(item: StreamItem): Promise<void> {
  const id = String(item.stream_id ?? item.series_id ?? item.name);
  const counts = await loadWatchCounts();
  const items = await loadWatchItems();
  counts[id] = (counts[id] || 0) + 1;
  items[id] = item;
  _watchCounts = counts;
  _watchItems = items;
  await AsyncStorage.setItem(WATCH_COUNTS_KEY, JSON.stringify(counts));
  await AsyncStorage.setItem(WATCH_ITEMS_KEY, JSON.stringify(items));
}

export async function getMostWatched(limit = 20): Promise<StreamItem[]> {
  const counts = await loadWatchCounts();
  const items = await loadWatchItems();
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => items[id])
    .filter(Boolean);
}

/* ── Resume Positions ───────────────────────────────────────── */
const RESUME_KEY = "resume_positions_v1";
let _resumePositions: Record<string, { posMs: number; durMs: number; ts: number }> | null = null;

async function loadResumePositions() {
  if (_resumePositions !== null) return _resumePositions;
  try {
    const raw = await AsyncStorage.getItem(RESUME_KEY);
    _resumePositions = raw ? JSON.parse(raw) : {};
  } catch {
    _resumePositions = {};
  }
  return _resumePositions!;
}

export async function saveResumePosition(key: string, posMs: number, durMs: number): Promise<void> {
  if (durMs <= 0 || posMs < 3000) return;
  const pct = posMs / durMs;
  const positions = await loadResumePositions();
  if (pct >= 0.95) {
    delete positions[key];
  } else {
    positions[key] = { posMs, durMs, ts: Date.now() };
  }
  _resumePositions = positions;
  await AsyncStorage.setItem(RESUME_KEY, JSON.stringify(positions));
}

export async function getResumePosition(key: string): Promise<number | null> {
  const positions = await loadResumePositions();
  const entry = positions[key];
  if (!entry) return null;
  const ageDays = (Date.now() - entry.ts) / 86400000;
  if (ageDays > 30) return null;
  return entry.posMs;
}

export async function clearResumePosition(key: string): Promise<void> {
  const positions = await loadResumePositions();
  delete positions[key];
  _resumePositions = positions;
  await AsyncStorage.setItem(RESUME_KEY, JSON.stringify(positions));
}

/* ── Notifications ──────────────────────────────────────────── */
const LAST_NOTIF_KEY = "last_notification_id";

export async function getLastSeenNotifId(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_NOTIF_KEY);
}

export async function setLastSeenNotifId(id: string): Promise<void> {
  await AsyncStorage.setItem(LAST_NOTIF_KEY, id);
}
