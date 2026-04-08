import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, Pressable, StyleSheet, TextInput,
  FlatList, Animated, Easing, Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { API_BASE, useApiFetch, type StreamItem } from "@/hooks/useApi";

const MAX_PICKS = 4;

function PosterThumb({ item, onRemove }: { item: StreamItem; onRemove: () => void }) {
  const img = item.cover || item.stream_icon || "";
  return (
    <View style={s.pickCard}>
      {img ? <Image source={{ uri: img }} style={s.pickImg} /> : <View style={[s.pickImg, { backgroundColor: "#2a2a18" }]} />}
      <Text style={s.pickName} numberOfLines={2}>{item.name}</Text>
      <Pressable onPress={onRemove} style={s.pickRemove}>
        <Text style={s.pickRemoveText}>✕</Text>
      </Pressable>
    </View>
  );
}

function SpinWheel({ items, winner, spinning }: { items: StreamItem[]; winner: StreamItem | null; spinning: boolean }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (spinning) {
      anim.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 300, easing: Easing.linear, useNativeDriver: true })
      );
      anim.current.start();
    } else {
      anim.current?.stop();
      Animated.timing(spinAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [spinning]);

  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={s.wheelWrap}>
      <Text style={s.wheelTitle}>🎡 جاري تدوير العجلة...</Text>
      <Animated.View style={[s.wheel, { transform: [{ rotate }] }]}>
        {items.map((item, i) => {
          const angle = (360 / items.length) * i;
          const rad = (angle * Math.PI) / 180;
          const r = 90;
          const x = r * Math.cos(rad);
          const y = r * Math.sin(rad);
          const isWinner = !spinning && winner && (item.stream_id ?? -1) === (winner.stream_id ?? -2);
          return (
            <View key={String(item.stream_id ?? i)} style={[s.wheelSlice, { transform: [{ translateX: x }, { translateY: y }], backgroundColor: isWinner ? colors.accent : "#2a2a18" }]}>
              <Text style={[s.wheelSliceText, isWinner && { color: "#111" }]} numberOfLines={1}>{item.name.slice(0, 8)}</Text>
            </View>
          );
        })}
        <View style={s.wheelCenter}>
          <Text style={s.wheelCenterText}>🎯</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function FamilyVoteScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [picks, setPicks] = useState<StreamItem[]>([]);
  const [phase, setPhase] = useState<"pick" | "spin" | "result">("pick");
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<StreamItem | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const resultScale = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const { data: allMovies } = useApiFetch<StreamItem[]>(`${API_BASE}/api/vod/streams`);

  const filtered = useMemo(() => {
    if (!allMovies) return [];
    if (!search.trim()) return allMovies.slice(0, 40);
    const q = search.trim().toLowerCase();
    return allMovies.filter(m => m.name.toLowerCase().includes(q)).slice(0, 30);
  }, [allMovies, search]);

  function pickItem(item: StreamItem) {
    if (picks.length >= MAX_PICKS) return;
    if (picks.find(p => p.stream_id === item.stream_id)) return;
    setPicks(prev => [...prev, item]);
  }

  function removeItem(item: StreamItem) {
    setPicks(prev => prev.filter(p => p.stream_id !== item.stream_id));
  }

  function startSpin() {
    if (picks.length < 2) return;
    setPhase("spin");
    setSpinning(true);

    const spinDuration = 2500 + Math.random() * 1500;
    setTimeout(() => {
      const w = picks[Math.floor(Math.random() * picks.length)];
      setWinner(w);
      setSpinning(false);
      setTimeout(() => {
        setPhase("result");
        Animated.parallel([
          Animated.spring(resultScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
          Animated.timing(resultOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();

        let t = 10;
        setCountdown(t);
        const timer = setInterval(() => {
          t--;
          setCountdown(t);
          if (t <= 0) {
            clearInterval(timer);
            if (w) {
              router.replace({
                pathname: "/(home)/movie-detail",
                params: {
                  id: String(w.stream_id),
                  title: w.name,
                  cover: w.cover || w.stream_icon || "",
                  ext: w.container_extension || "mp4",
                  rating: String(w.rating || "0"),
                },
              });
            }
          }
        }, 1000);
      }, 800);
    }, spinDuration);
  }

  if (phase === "spin") {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>👨‍👩‍👧 التصويت العائلي</Text>
        </View>
        <View style={s.spinScreen}>
          <SpinWheel items={picks} winner={winner} spinning={spinning} />
        </View>
      </View>
    );
  }

  if (phase === "result" && winner) {
    const img = winner.cover || winner.stream_icon || "";
    return (
      <View style={[s.root, { paddingTop: insets.top, backgroundColor: "#050505" }]}>
        <View style={s.resultBg} />
        <Animated.View style={[s.resultCard, { transform: [{ scale: resultScale }], opacity: resultOpacity }]}>
          <Text style={s.trophyIcon}>🏆</Text>
          <Text style={s.resultLabel}>تم اختيار الفيلم!</Text>
          {img ? <Image source={{ uri: img }} style={s.resultPoster} /> : null}
          <Text style={s.resultTitle}>{winner.name}</Text>
          <Text style={s.resultMsg}>مشاهدة ممتعة 🎬✨</Text>
          <Text style={s.countdown}>يبدأ التشغيل خلال {countdown} ثانية...</Text>
          <Pressable
            hasTVPreferredFocus
            onPress={() => router.replace({
              pathname: "/(home)/movie-detail",
              params: {
                id: String(winner.stream_id),
                title: winner.name,
                cover: winner.cover || winner.stream_icon || "",
                ext: winner.container_extension || "mp4",
                rating: String(winner.rating || "0"),
              },
            })}
            style={({ focused }) => [s.watchBtn, (focused as boolean) && s.watchBtnFocused]}
          >
            <Text style={s.watchBtnText}>▶ شاهد الآن</Text>
          </Pressable>
          <Pressable onPress={() => { setPhase("pick"); setPicks([]); setWinner(null); }} style={s.cancelBtn}>
            <Text style={s.cancelText}>اختيار أفلام أخرى</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hasTVPreferredFocus style={({ focused }) => [s.backBtn, (focused as boolean) && s.backBtnF]}>
          <Text style={s.backBtnText}>← رجوع</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>👨‍👩‍👧 التصويت العائلي</Text>
          <Text style={s.headerSub}>ابحث واختر {MAX_PICKS} أفلام ثم أدّر العجلة</Text>
        </View>
        <Pressable
          onPress={startSpin}
          disabled={picks.length < 2}
          style={({ focused }) => [
            s.spinBtn,
            picks.length < 2 && s.spinBtnDisabled,
            (focused as boolean) && picks.length >= 2 && s.spinBtnFocused,
          ]}
        >
          <Text style={[s.spinBtnText, picks.length < 2 && { color: "#555" }]}>🎡 أدّر العجلة</Text>
        </Pressable>
      </View>

      {picks.length > 0 && (
        <View style={s.picksBar}>
          <Text style={s.picksLabel}>المختارة ({picks.length}/{MAX_PICKS}):</Text>
          <View style={s.picksRow}>
            {picks.map(item => (
              <PosterThumb key={String(item.stream_id)} item={item} onRemove={() => removeItem(item)} />
            ))}
            {Array.from({ length: MAX_PICKS - picks.length }).map((_, i) => (
              <View key={`empty-${i}`} style={s.pickEmpty}>
                <Text style={s.pickEmptyText}>+</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="ابحث عن فيلم..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} style={s.clearBtn}>
            <Text style={s.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => String(i.stream_id ?? i.name)}
        numColumns={5}
        contentContainerStyle={s.grid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>{allMovies ? "لا نتائج" : "جاري التحميل..."}</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const picked = picks.find(p => p.stream_id === item.stream_id);
          const img = item.cover || item.stream_icon || "";
          return (
            <Pressable
              onPress={() => picked ? removeItem(item) : pickItem(item)}
              hasTVPreferredFocus={index === 0}
              style={({ focused }) => [
                s.movieCard,
                picked && s.movieCardPicked,
                (focused as boolean) && s.movieCardFocused,
                picks.length >= MAX_PICKS && !picked && s.movieCardDim,
              ]}
            >
              {img
                ? <Image source={{ uri: img }} style={s.movieImg} />
                : <View style={[s.movieImg, { backgroundColor: "#1e1e10" }]} />
              }
              <Text style={s.movieName} numberOfLines={2}>{item.name}</Text>
              {picked && <View style={s.pickedBadge}><Text style={s.pickedBadgeText}>✓</Text></View>}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.sidebar, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 14,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 14,
    paddingVertical: 9, borderRadius: 8, borderWidth: 2, borderColor: "transparent",
  },
  backBtnF: { borderColor: colors.accent },
  backBtnText: { color: "#fff", fontSize: 14 },
  headerCenter: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  spinBtn: {
    backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 10, borderWidth: 2, borderColor: "transparent",
  },
  spinBtnDisabled: { backgroundColor: "#2a2a18" },
  spinBtnFocused: { borderColor: "#fff", shadowColor: colors.accentGlow, shadowOpacity: 1, shadowRadius: 12 },
  spinBtnText: { color: "#111", fontSize: 15, fontWeight: "900" },

  picksBar: {
    backgroundColor: "#0d0d07", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  picksLabel: { color: colors.accent, fontSize: 12, fontWeight: "700", marginBottom: 8 },
  picksRow: { flexDirection: "row", gap: 10 },
  pickCard: {
    width: 70, alignItems: "center", gap: 4, position: "relative",
  },
  pickImg: { width: 60, height: 84, borderRadius: 6, borderWidth: 2, borderColor: colors.accent },
  pickName: { color: "#fff", fontSize: 9, textAlign: "center" },
  pickRemove: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: "#ef4444", width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  pickRemoveText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  pickEmpty: {
    width: 60, height: 84, borderRadius: 6, borderWidth: 2, borderColor: "#2a2a18",
    borderStyle: "dashed", alignItems: "center", justifyContent: "center",
  },
  pickEmptyText: { color: "#2a2a18", fontSize: 28 },

  searchRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1, backgroundColor: "#1a1a0d", color: "#fff",
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, borderWidth: 1, borderColor: colors.border, textAlign: "right",
  },
  clearBtn: {
    backgroundColor: "#2a2a18", width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  clearBtnText: { color: "#888", fontSize: 14 },

  grid: { paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 40 },
  movieCard: {
    flex: 1, margin: 5, alignItems: "center", gap: 5,
    borderRadius: 8, borderWidth: 2, borderColor: "transparent", padding: 4,
  },
  movieCardPicked: { borderColor: colors.accent, backgroundColor: `${colors.accent}15` },
  movieCardFocused: { borderColor: colors.accent, transform: [{ scale: 1.06 }] },
  movieCardDim: { opacity: 0.4 },
  movieImg: { width: 90, height: 126, borderRadius: 6 },
  movieName: { color: "#ccc", fontSize: 10, textAlign: "center" },
  pickedBadge: {
    position: "absolute", top: 4, right: 4,
    backgroundColor: colors.accent, width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  pickedBadgeText: { color: "#111", fontSize: 12, fontWeight: "900" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: "#555", fontSize: 16 },

  spinScreen: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: "#050505",
  },
  wheelWrap: { alignItems: "center", gap: 30 },
  wheelTitle: { color: colors.accent, fontSize: 24, fontWeight: "800", letterSpacing: 2 },
  wheel: {
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 3, borderColor: colors.accent,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#1a1a0d",
  },
  wheelSlice: {
    position: "absolute", width: 70, height: 28, borderRadius: 6,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  wheelSliceText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  wheelCenter: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  wheelCenterText: { fontSize: 20 },

  resultBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.97)" },
  resultCard: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40,
  },
  trophyIcon: { fontSize: 70 },
  resultLabel: { color: colors.accent, fontSize: 20, fontWeight: "800", letterSpacing: 2 },
  resultPoster: { width: 120, height: 168, borderRadius: 10, borderWidth: 3, borderColor: colors.accent },
  resultTitle: { color: "#fff", fontSize: 28, fontWeight: "900", textAlign: "center" },
  resultMsg: { color: "#fff", fontSize: 20, fontWeight: "700" },
  countdown: { color: "#666", fontSize: 14 },
  watchBtn: {
    backgroundColor: colors.accent, paddingHorizontal: 48, paddingVertical: 18,
    borderRadius: 12, borderWidth: 2, borderColor: "transparent", marginTop: 8,
  },
  watchBtnFocused: { backgroundColor: "#fff", borderColor: colors.accent },
  watchBtnText: { color: "#111", fontSize: 20, fontWeight: "900" },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  cancelText: { color: "#666", fontSize: 14 },
});
