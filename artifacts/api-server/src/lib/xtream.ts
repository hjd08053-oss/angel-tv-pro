const BASE_URL = process.env.XTREAM_URL || "http://barqtv.art:80";
const USERNAME = process.env.XTREAM_USERNAME || "Angelfor4u";
const PASSWORD = process.env.XTREAM_PASSWORD || "1122331100";

export const XTREAM = { BASE_URL, USERNAME, PASSWORD };

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchXtream(action: string, extra = ""): Promise<unknown> {
  const key = action + extra;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = `${BASE_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=${action}${extra}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Xtream API error: ${res.status}`);
  const data = await res.json();
  cache.set(key, { data, ts: Date.now() });
  return data;
}

export async function getAccountInfo() {
  const url = `${BASE_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}`;
  const res = await fetch(url);
  return res.json();
}

export async function getLiveCategories() {
  return fetchXtream("get_live_categories");
}

export async function getLiveStreams(categoryId?: string) {
  const extra = categoryId ? `&category_id=${categoryId}` : "";
  return fetchXtream("get_live_streams", extra);
}

export async function getVodCategories() {
  return fetchXtream("get_vod_categories");
}

export async function getVodStreams(categoryId?: string) {
  const extra = categoryId ? `&category_id=${categoryId}` : "";
  return fetchXtream("get_vod_streams", extra);
}

export async function getVodInfo(vodId: string) {
  return fetchXtream("get_vod_info", `&vod_id=${vodId}`);
}

export async function getSeriesCategories() {
  return fetchXtream("get_series_categories");
}

export async function getSeries(categoryId?: string) {
  const extra = categoryId ? `&category_id=${categoryId}` : "";
  return fetchXtream("get_series", extra);
}

export async function getSeriesInfo(seriesId: string) {
  return fetchXtream("get_series_info", `&series_id=${seriesId}`);
}

export function getLiveStreamUrl(streamId: string, format: "m3u8" | "ts" = "m3u8") {
  return `${BASE_URL}/live/${USERNAME}/${PASSWORD}/${streamId}.${format}`;
}

export function getVodStreamUrl(streamId: string, ext = "mp4") {
  return `${BASE_URL}/movie/${USERNAME}/${PASSWORD}/${streamId}.${ext}`;
}

export function getSeriesStreamUrl(streamId: string, ext = "mkv") {
  return `${BASE_URL}/series/${USERNAME}/${PASSWORD}/${streamId}.${ext}`;
}

export function clearCache() {
  cache.clear();
}
