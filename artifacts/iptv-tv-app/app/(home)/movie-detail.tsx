import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { API_BASE } from "@/hooks/useApi";
import { addToWatchlist, removeFromWatchlist, isInWatchlist, loadRecentlyWatched } from "@/hooks/storage";

export default function MovieDetailScreen() {
  const { id, title, cover, ext, rating } = useLocalSearchParams<{ id: string; title: string; cover: string; ext: string; rating: string }>();
  const insets = useSafeAreaInsets();
  const [imgError, setImgError] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [smartScore, setSmartScore] = useState<number | null>(null);

  useEffect(() => {
    isInWatchlist(Number(id)).then(setInWatchlist);
    loadRecentlyWatched().then(history => {
      if (history.length === 0) return;
      const catCounts: Record<string, number> = {};
      for (const w of history) {
        const cat = w.category_id || "0";
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      }
      const maxCount = Math.max(...Object.values(catCounts));
      const score = 55 + Math.round(((catCounts["0"] || 0) / Math.max(maxCount, 1)) * 40);
      setSmartScore(Math.min(score, 97));
    });
  }, [id]);

  async function toggleWatchlist() {
    setWatchlistLoading(true);
    const item = { stream_id: Number(id), name: title, cover, stream_icon: cover, container_extension: ext, rating, _tab: "movies" };
    if (inWatchlist) {
      await removeFromWatchlist(Number(id));
      setInWatchlist(false);
    } else {
      await addToWatchlist(item as any);
      setInWatchlist(true);
    }
    setWatchlistLoading(false);
  }

  function play() {
    const url = `${API_BASE}/api/proxy/movie/${id}?ext=${ext || "mp4"}`;
    const itemPayload = { stream_id: Number(id), name: title, cover, stream_icon: cover, container_extension: ext, rating, _tab: "movies" };
    const rk = `movie-${id}`;
    router.push({ pathname: "/(home)/player", params: { url: encodeURIComponent(url), title, itemData: encodeURIComponent(JSON.stringify(itemPayload)), resumeKey: rk } });
  }

  const ratingNum = parseFloat(rating || "0");

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bgGradient} />

      <Pressable
        onPress={() => router.back()}
        hasTVPreferredFocus
        style={({ focused }) => [styles.backBtn, (focused as boolean) && styles.backBtnFocused]}
      >
        <Text style={styles.backBtnText}>← رجوع</Text>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.posterWrap}>
          {cover && !imgError ? (
            <Image source={{ uri: cover }} style={styles.poster} resizeMode="cover" onError={() => setImgError(true)} />
          ) : (
            <View style={[styles.poster, styles.posterPlaceholder]}>
              <Text style={styles.posterIcon}>🎬</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.metaRow}>
            {ratingNum > 0 ? (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingIcon}>★</Text>
                <Text style={styles.ratingText}>{ratingNum.toFixed(1)}</Text>
              </View>
            ) : null}
            {smartScore !== null && (
              <View style={styles.smartScoreRow}>
                <Text style={styles.smartScoreIcon}>🧠</Text>
                <Text style={styles.smartScoreText}>ستحبه بنسبة {smartScore}%</Text>
              </View>
            )}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={play}
              style={({ focused }) => [styles.playBtn, (focused as boolean) && styles.playBtnFocused]}
            >
              <Text style={styles.playBtnIcon}>▶</Text>
              <Text style={styles.playBtnText}>شغّل الآن</Text>
            </Pressable>

            <Pressable
              onPress={toggleWatchlist}
              style={({ focused }) => [styles.wlBtn, inWatchlist && styles.wlBtnActive, (focused as boolean) && styles.wlBtnFocused]}
            >
              {watchlistLoading ? (
                <ActivityIndicator size="small" color={inWatchlist ? "#111" : colors.accent} />
              ) : (
                <>
                  <Text style={[styles.wlBtnIcon, inWatchlist && styles.wlBtnIconActive]}>{inWatchlist ? "✓" : "+"}</Text>
                  <Text style={[styles.wlBtnText, inWatchlist && styles.wlBtnTextActive]}>
                    {inWatchlist ? "في القائمة" : "أضف للقائمة"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d0d06" },
  bgGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0d0d06" },
  backBtn: {
    position: "absolute", top: 60, left: 24, zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8,
    borderWidth: 2, borderColor: "transparent",
  },
  backBtnFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.18)" },
  backBtnText: { color: "#fff", fontSize: 16 },
  content: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", paddingHorizontal: 80, gap: 60, marginTop: 40,
  },
  posterWrap: { shadowColor: "#000", shadowOpacity: 0.7, shadowRadius: 24, elevation: 20 },
  poster: { width: 240, height: 350, borderRadius: 14, backgroundColor: "#1a1a0d" },
  posterPlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  posterIcon: { fontSize: 60 },
  info: { flex: 1, maxWidth: 500, gap: 20, alignItems: "flex-end" },
  title: { color: "#fff", fontSize: 32, fontWeight: "900", textAlign: "right", lineHeight: 42 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingIcon: { color: colors.accent, fontSize: 22 },
  ratingText: { color: colors.accent, fontSize: 22, fontWeight: "700" },
  smartScoreRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(100,220,100,0.1)", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(100,220,100,0.3)",
  },
  smartScoreIcon: { fontSize: 16 },
  smartScoreText: { color: "#4ade80", fontSize: 14, fontWeight: "700" },
  actionRow: { gap: 12, alignSelf: "stretch" },
  playBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.accent, paddingHorizontal: 40, paddingVertical: 18,
    borderRadius: 10, gap: 12, borderWidth: 2, borderColor: "transparent",
  },
  playBtnFocused: { backgroundColor: "#fff", borderColor: "#fff", shadowColor: "#fff", shadowOpacity: 0.8, shadowRadius: 18, elevation: 12 },
  playBtnIcon: { color: "#111", fontSize: 22 },
  playBtnText: { color: "#111", fontSize: 22, fontWeight: "900" },
  wlBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(240,191,26,0.08)",
    paddingHorizontal: 40, paddingVertical: 16, borderRadius: 10, gap: 10,
    borderWidth: 2, borderColor: colors.border,
  },
  wlBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  wlBtnFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.14)" },
  wlBtnIcon: { color: colors.accent, fontSize: 20, fontWeight: "700" },
  wlBtnIconActive: { color: "#111" },
  wlBtnText: { color: colors.accent, fontSize: 17, fontWeight: "700" },
  wlBtnTextActive: { color: "#111" },
});
