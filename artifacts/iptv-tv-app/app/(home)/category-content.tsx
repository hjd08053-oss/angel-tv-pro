import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { PosterCard } from "@/components/PosterCard";
import { API_BASE, type ContentTab, type StreamItem } from "@/hooks/useApi";
import { apiFetchPaged } from "@/hooks/apiClient";

type SortMode = "default" | "alpha" | "rating" | "newest";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "default",  label: "افتراضي" },
  { key: "alpha",    label: "أ-ي" },
  { key: "rating",   label: "التقييم" },
  { key: "newest",   label: "الأحدث" },
];

const PAGE = 100;

export default function CategoryContentScreen() {
  const { catId, catName, tab } = useLocalSearchParams<{
    catId: string; catName: string; tab: ContentTab;
  }>();
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<SortMode>("default");

  // ── Data state ─────────────────────────────────────────
  const [items, setItems]     = useState<StreamItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [offset, setOffset]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const fetchedRef = useRef(false);

  // ── Build URL ──────────────────────────────────────────
  function buildUrl(off: number) {
    const base =
      tab === "live"   ? `${API_BASE}/api/live/streams` :
      tab === "movies" ? `${API_BASE}/api/vod/streams` :
                         `${API_BASE}/api/series/list`;

    const params = new URLSearchParams();
    if (catId !== "all") params.set("category_id", catId);
    params.set("limit", String(PAGE));
    params.set("offset", String(off));
    return `${base}?${params.toString()}`;
  }

  // ── Initial fetch ──────────────────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    apiFetchPaged<StreamItem>(buildUrl(0))
      .then(res => {
        setItems(res.data);
        setTotal(res.total);
        setOffset(PAGE);
        setHasMore(res.data.length < res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catId, tab]);

  // ── Load more (pagination) ─────────────────────────────
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    apiFetchPaged<StreamItem>(buildUrl(offset))
      .then(res => {
        setItems(prev => {
          const ids = new Set(prev.map(i => i.stream_id ?? i.series_id ?? i.name));
          return [...prev, ...res.data.filter(i => !ids.has(i.stream_id ?? i.series_id ?? i.name))];
        });
        setTotal(res.total);
        setOffset(o => o + PAGE);
        setHasMore(items.length + res.data.length < res.total);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, hasMore, loadingMore, items.length]);

  // ── Sort ───────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (sort === "default") return items;
    const copy = [...items];
    if (sort === "alpha")   return copy.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    if (sort === "rating")  return copy.sort((a, b) => parseFloat(String(b.rating || 0)) - parseFloat(String(a.rating || 0)));
    if (sort === "newest")  return copy.sort((a, b) => Number(b.added || 0) - Number(a.added || 0));
    return copy;
  }, [items, sort]);

  // ── Open item ──────────────────────────────────────────
  function openItem(item: StreamItem) {
    if (tab === "series") {
      router.push({ pathname: "/(home)/series-detail", params: { id: String(item.series_id ?? item.stream_id), title: item.name, cover: item.cover || item.stream_icon || "" } });
    } else if (tab === "movies") {
      router.push({ pathname: "/(home)/movie-detail", params: { id: String(item.stream_id), title: item.name, cover: item.cover || item.stream_icon || "", ext: item.container_extension || "mp4", rating: String(item.rating || "0") } });
    } else {
      const url = `${API_BASE}/api/proxy/live/${item.stream_id}?format=m3u8`;
      const itemPayload = { ...item, _tab: tab };
      router.push({ pathname: "/(home)/player", params: { url: encodeURIComponent(url), title: item.name, itemData: encodeURIComponent(JSON.stringify(itemPayload)) } });
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hasTVPreferredFocus
          style={({ focused }) => [styles.backBtn, (focused as boolean) && styles.backBtnFocused]}
        >
          <Text style={styles.backBtnText}>← رجوع</Text>
        </Pressable>
        <Text style={styles.catTitle}>{catName}</Text>
        <Text style={styles.catCount}>{total > 0 ? `${sorted.length} / ${total}` : ""}</Text>
      </View>

      {/* Sort bar */}
      {tab !== "live" && (
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>ترتيب:</Text>
          {SORT_OPTIONS.map(opt => (
            <Pressable
              key={opt.key}
              onPress={() => setSort(opt.key)}
              style={({ focused }) => [
                styles.filterBtn,
                sort === opt.key && styles.filterBtnActive,
                (focused as boolean) && styles.filterBtnFocused,
              ]}
            >
              <Text style={[styles.filterBtnText, sort === opt.key && styles.filterBtnTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={it => String(it.stream_id ?? it.series_id ?? it.name)}
          numColumns={tab === "live" ? 8 : 9}
          key={`${tab}-${catId}`}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={28}
          windowSize={5}
          initialNumToRender={28}
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>لا يوجد محتوى</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreWrap}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.loadMoreText}>يحمّل المزيد...</Text>
              </View>
            ) : hasMore ? (
              <Pressable
                onPress={loadMore}
                style={({ focused }) => [styles.loadMoreBtn, (focused as boolean) && styles.loadMoreBtnFocused]}
              >
                <Text style={styles.loadMoreBtnText}>تحميل المزيد ({total - sorted.length} متبقي)</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item, index }) => (
            <PosterCard
              item={item}
              variant={tab === "live" ? "channel" : "poster"}
              hasTVPreferredFocus={index === 0}
              onSelect={() => openItem(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.sidebar,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 16,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 16,
    paddingVertical: 9, borderRadius: 8, borderWidth: 3, borderColor: "transparent",
  },
  backBtnFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.18)" },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  catTitle: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "right" },
  catCount: { color: colors.accent, fontSize: 14, fontWeight: "700", minWidth: 70, textAlign: "left" },
  filterBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
    backgroundColor: "#0e0e07", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filterLabel: { color: "#888", fontSize: 13, marginRight: 4 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "#1a1a0d", borderWidth: 3, borderColor: "transparent",
  },
  filterBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterBtnFocused: { borderColor: "#fff" },
  filterBtnText: { color: "#888", fontSize: 13, fontWeight: "600" },
  filterBtnTextActive: { color: "#111" },
  grid: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  loadingText: { color: "#aaa", fontSize: 16 },
  emptyText: { color: "#666", fontSize: 16 },
  loadMoreWrap: { alignItems: "center", paddingVertical: 20, gap: 8 },
  loadMoreText: { color: "#888", fontSize: 14 },
  loadMoreBtn: {
    margin: 20, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 10, backgroundColor: "#1a1a0d",
    borderWidth: 3, borderColor: "#555", alignItems: "center",
  },
  loadMoreBtnFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.18)" },
  loadMoreBtnText: { color: "#ccc", fontSize: 14, fontWeight: "700" },
});
