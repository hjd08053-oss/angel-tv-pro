import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, Pressable, FlatList, StyleSheet, Image,
  ActivityIndicator, ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { API_BASE, useApiFetch, getEpisodeStreamUrl, type SeriesInfo, type Episode } from "@/hooks/useApi";
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from "@/hooks/storage";

export default function SeriesDetailScreen() {
  const { id, title, cover } = useLocalSearchParams<{ id: string; title: string; cover: string }>();
  const insets = useSafeAreaInsets();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [coverErr, setCoverErr] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [wlLoading, setWlLoading] = useState(false);

  const { data: info, loading } = useApiFetch<SeriesInfo>(`${API_BASE}/api/series/info/${id}`);

  useEffect(() => {
    isInWatchlist(Number(id)).then(setInWatchlist);
  }, [id]);

  const seasons = useMemo(() => {
    if (!info?.episodes) return [];
    return Object.keys(info.episodes).sort((a, b) => Number(a) - Number(b));
  }, [info]);

  const activeSeason = selectedSeason || seasons[0] || null;

  const episodes: Episode[] = useMemo(() => {
    if (!info?.episodes || !activeSeason) return [];
    return (info.episodes[activeSeason] || []).sort((a, b) => (a.episode_num || 0) - (b.episode_num || 0));
  }, [info, activeSeason]);

  const seriesCover = cover || info?.info?.cover;

  async function toggleWatchlist() {
    setWlLoading(true);
    const item = { series_id: Number(id), name: title, cover: seriesCover, stream_icon: seriesCover, _tab: "series" };
    if (inWatchlist) {
      await removeFromWatchlist(Number(id));
      setInWatchlist(false);
    } else {
      await addToWatchlist(item as any);
      setInWatchlist(true);
    }
    setWlLoading(false);
  }

  function playEpisode(ep: Episode) {
    const url = getEpisodeStreamUrl(ep.id, ep.container_extension || "mkv");
    const itemPayload = { series_id: Number(id), name: title, cover: seriesCover, stream_icon: seriesCover, _tab: "series" };
    const rk = `series-${id}-s${activeSeason}-e${ep.episode_num}`;
    router.push({ pathname: "/(home)/player", params: { url: encodeURIComponent(url), title: `${title} - ح${ep.episode_num || ep.id}`, itemData: encodeURIComponent(JSON.stringify(itemPayload)), resumeKey: rk } });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Top section ── */}
      <View style={styles.topSection}>
        {seriesCover && !coverErr ? (
          <Image source={{ uri: seriesCover }} style={styles.backdrop} resizeMode="cover" blurRadius={18} onError={() => setCoverErr(true)} />
        ) : null}
        <View style={styles.backdropOverlay} />

        <Pressable onPress={() => router.back()} hasTVPreferredFocus style={({ focused }) => [styles.backBtn, (focused as boolean) && styles.backBtnFocused]}>
          <Text style={styles.backBtnText}>← رجوع</Text>
        </Pressable>

        <View style={styles.infoRow}>
          <View style={styles.posterWrap}>
            {seriesCover && !coverErr ? (
              <Image source={{ uri: seriesCover }} style={styles.poster} resizeMode="cover" onError={() => setCoverErr(true)} />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]}><Text style={{ fontSize: 40 }}>📺</Text></View>
            )}
          </View>
          <View style={styles.infoText}>
            <Text style={styles.seriesTitle}>{title}</Text>
            <Text style={styles.seriesMeta}>{seasons.length} موسم  •  {episodes.length} حلقة</Text>
            {info?.info?.plot ? (
              <Text style={styles.plot} numberOfLines={3}>{info.info.plot}</Text>
            ) : null}
            <Pressable
              onPress={toggleWatchlist}
              style={({ focused }) => [styles.wlBtn, inWatchlist && styles.wlBtnActive, (focused as boolean) && styles.wlBtnFocused]}
            >
              {wlLoading ? (
                <ActivityIndicator size="small" color={inWatchlist ? "#111" : colors.accent} />
              ) : (
                <Text style={[styles.wlBtnText, inWatchlist && styles.wlBtnTextActive]}>
                  {inWatchlist ? "✓ في القائمة" : "+ أضف للقائمة"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Seasons + Episodes ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>جاري تحميل الحلقات...</Text>
        </View>
      ) : (
        <View style={styles.bottomSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonsBar} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, alignItems: "center" }}>
            {seasons.map(s => (
              <Pressable
                key={s}
                onPress={() => setSelectedSeason(s)}
                style={({ focused }) => [styles.seasonBtn, activeSeason === s && styles.seasonBtnActive, (focused as boolean) && styles.seasonBtnFocused]}
              >
                <Text style={[styles.seasonBtnText, activeSeason === s && styles.seasonBtnTextActive]}>
                  موسم {s}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <FlatList
            data={episodes}
            keyExtractor={ep => ep.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.epList}
            renderItem={({ item: ep, index }) => (
              <EpisodeRow ep={ep} onPlay={() => playEpisode(ep)} hasTVPreferredFocus={index === 0 && activeSeason === seasons[0]} />
            )}
          />
        </View>
      )}
    </View>
  );
}

function EpisodeRow({ ep, onPlay, hasTVPreferredFocus }: { ep: Episode; onPlay: () => void; hasTVPreferredFocus?: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const thumb = ep.info?.movie_image;

  return (
    <Pressable
      onPress={onPlay}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={({ focused }) => [styles.epRow, (focused as boolean) && styles.epRowFocused]}
    >
      {({ focused }: { focused: boolean }) => (
        <>
          <View style={styles.epThumb}>
            {thumb && !imgErr ? (
              <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setImgErr(true)} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.epThumbPlaceholder]}>
                <Text style={styles.epNumText}>ح{ep.episode_num}</Text>
              </View>
            )}
            {focused && (
              <View style={styles.epPlayOverlay}>
                <Text style={styles.epPlayIcon}>▶</Text>
              </View>
            )}
          </View>
          <View style={styles.epInfo}>
            <Text style={[styles.epTitle, focused && styles.epTitleFocused]} numberOfLines={1}>
              {ep.title || `الحلقة ${ep.episode_num}`}
            </Text>
            <Text style={styles.epSub} numberOfLines={1}>{ep.title ? `الحلقة ${ep.episode_num}` : ""}</Text>
            {ep.info?.duration ? <Text style={styles.epDuration}>{ep.info.duration}</Text> : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topSection: { height: 240, overflow: "hidden", position: "relative" },
  backdrop: { ...StyleSheet.absoluteFillObject as any },
  backdropOverlay: { ...StyleSheet.absoluteFillObject as any, backgroundColor: "rgba(17,17,8,0.75)" },
  backBtn: {
    position: "absolute", top: 14, left: 20, zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, borderWidth: 2, borderColor: "transparent",
  },
  backBtnFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.18)" },
  backBtnText: { color: "#fff", fontSize: 15 },
  infoRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 24, paddingBottom: 16, paddingTop: 50, gap: 20, flex: 1 },
  posterWrap: { shadowColor: "#000", shadowOpacity: 0.8, shadowRadius: 12, elevation: 12 },
  poster: { width: 110, height: 155, borderRadius: 10, backgroundColor: "#1a1a0d" },
  posterPlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  infoText: { flex: 1, gap: 6, paddingBottom: 4 },
  seriesTitle: { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "right" },
  seriesMeta: { color: colors.accent, fontSize: 13, fontWeight: "600", textAlign: "right" },
  plot: { color: "#aaa", fontSize: 12, textAlign: "right", lineHeight: 18 },
  wlBtn: {
    alignSelf: "flex-end", paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 8, borderWidth: 2, borderColor: colors.border, backgroundColor: "rgba(240,191,26,0.08)",
    marginTop: 4,
  },
  wlBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  wlBtnFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.14)" },
  wlBtnText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  wlBtnTextActive: { color: "#111" },

  bottomSection: { flex: 1 },
  seasonsBar: { maxHeight: 54, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  seasonBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1e1e10", borderWidth: 2, borderColor: "transparent" },
  seasonBtnActive: { backgroundColor: colors.accent },
  seasonBtnFocused: { borderColor: "#ffffff" },
  seasonBtnText: { color: "#aaa", fontSize: 14, fontWeight: "700" },
  seasonBtnTextActive: { color: "#111" },

  epList: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },
  epRow: {
    flexDirection: "row", alignItems: "center", gap: 16,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
    marginBottom: 6, backgroundColor: colors.card, borderWidth: 2, borderColor: "transparent",
  },
  epRowFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.08)" },
  epThumb: { width: 160, height: 90, borderRadius: 8, backgroundColor: "#1a1a0d", overflow: "hidden" },
  epThumbPlaceholder: { backgroundColor: "#1e1e10", alignItems: "center", justifyContent: "center" },
  epNumText: { color: "#555", fontSize: 18, fontWeight: "900" },
  epPlayOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  epPlayIcon: { color: "#fff", fontSize: 28 },
  epInfo: { flex: 1, gap: 3 },
  epTitle: { color: "#fff", fontSize: 15, fontWeight: "700", textAlign: "right" },
  epTitleFocused: { color: "#ffffff" },
  epSub: { color: "#888", fontSize: 12, textAlign: "right" },
  epDuration: { color: "#666", fontSize: 11, textAlign: "right" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#aaa", fontSize: 16 },
});
