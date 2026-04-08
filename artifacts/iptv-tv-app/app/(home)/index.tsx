import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet,
  ActivityIndicator, Platform, Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/contexts/ThemeContext";
import { PosterCard } from "@/components/PosterCard";
import {
  API_BASE, useApiFetch, getRecentlyWatched,
  type ContentTab, type Category, type StreamItem,
} from "@/hooks/useApi";
import {
  loadWatchlist, getMostWatched, getLastSeenNotifId, setLastSeenNotifId,
} from "@/hooks/storage";

const TABS: { key: ContentTab; label: string }[] = [
  { key: "home", label: "الرئيسية" },
  { key: "live", label: "بث مباشر" },
  { key: "movies", label: "أفلام" },
  { key: "series", label: "مسلسلات" },
];

type Mood = "happy" | "excited" | "romantic" | "relaxed" | "thoughtful";
const MOODS: { key: Mood; emoji: string; label: string; keywords: string[] }[] = [
  { key: "happy", emoji: "😄", label: "مرح", keywords: ["comedy", "كوميدي", "مضحك", "family", "عائلي"] },
  { key: "excited", emoji: "😱", label: "إثارة", keywords: ["action", "أكشن", "thriller", "رعب", "horror", "adventure", "مغامرة"] },
  { key: "romantic", emoji: "💕", label: "رومانسي", keywords: ["romance", "رومانسي", "drama", "دراما"] },
  { key: "relaxed", emoji: "😌", label: "هادئ", keywords: ["documentary", "وثائقي", "nature", "طبيعة", "animation", "أنيميشن"] },
  { key: "thoughtful", emoji: "🤔", label: "مثير للتفكير", keywords: ["sci-fi", "علمي", "history", "تاريخي", "mystery", "غموض"] },
];

function getSmartRating(item: StreamItem, watchHistory: StreamItem[]): number {
  if (watchHistory.length === 0) return 0;
  const catCounts: Record<string, number> = {};
  for (const w of watchHistory) {
    const cat = w.category_id || "0";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const itemCat = item.category_id || "0";
  const maxCount = Math.max(...Object.values(catCounts));
  const matchCount = catCounts[itemCat] || 0;
  const base = 55;
  const match = Math.round((matchCount / Math.max(maxCount, 1)) * 40);
  return Math.min(base + match, 98);
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ContentTab>("home");
  const [search, setSearch] = useState("");
  const [recentlyWatched, setRecentlyWatched] = useState<StreamItem[]>([]);
  const [watchlist, setWatchlist] = useState<StreamItem[]>([]);
  const [mostWatched, setMostWatched] = useState<StreamItem[]>([]);
  const [notification, setNotification] = useState<{ id: string; title: string; message: string } | null>(null);
  const [subWarning, setSubWarning] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [channelAlerts, setChannelAlerts] = useState<Set<number>>(new Set());
  const micPulse = useRef(new Animated.Value(1)).current;
  const searchRef = useRef<TextInput>(null);

  const { data: homeData, loading: homeLoading } = useApiFetch<{
    recentMovies: StreamItem[];
    recentSeries: StreamItem[];
    vodCategories: Category[];
    seriesCategories: Category[];
    liveCategories: Category[];
  }>(`${API_BASE}/api/home`);

  const [searchResults, setSearchResults] = useState<StreamItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cats: Category[] = useMemo(() => {
    if (!homeData) return [];
    if (tab === "live") return homeData.liveCategories || [];
    if (tab === "movies") return homeData.vodCategories || [];
    if (tab === "series") return homeData.seriesCategories || [];
    return [];
  }, [homeData, tab]);

  const loadHomeData = useCallback(async () => {
    const [rw, wl, mw] = await Promise.all([getRecentlyWatched(), loadWatchlist(), getMostWatched(20)]);
    setRecentlyWatched(rw);
    setWatchlist(wl);
    setMostWatched(mw);
  }, []);

  useEffect(() => {
    loadHomeData();
    checkNotifications();
    checkSubWarning();
    loadChannelAlerts();
  }, []);

  useEffect(() => {
    if (tab === "home") loadHomeData();
  }, [tab]);

  async function loadChannelAlerts() {
    try {
      const raw = await AsyncStorage.getItem("channel_alerts");
      if (raw) setChannelAlerts(new Set(JSON.parse(raw)));
    } catch {}
  }

  async function checkNotifications() {
    try {
      const r = await fetch(`${API_BASE}/api/notifications`);
      const j = await r.json();
      const notifs = j.data || [];
      if (notifs.length === 0) return;
      const latest = notifs[0];
      const lastSeen = await getLastSeenNotifId();
      if (lastSeen !== latest.id) setNotification(latest);
    } catch {}
  }

  async function checkSubWarning() {
    try {
      const raw = await AsyncStorage.getItem("subscription");
      if (!raw) return;
      const sub = JSON.parse(raw);
      if (sub.is_lifetime || !sub.expires_at) return;
      const daysLeft = Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 7) setSubWarning(`اشتراكك ينتهي خلال ${daysLeft} أيام`);
    } catch {}
  }

  async function dismissNotification() {
    if (notification) {
      await setLastSeenNotifId(notification.id);
      setNotification(null);
    }
  }

  function activateMicSearch() {
    setSearch("");
    setTab(tab === "home" ? "movies" : tab);
    Animated.sequence([
      Animated.timing(micPulse, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(micPulse, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setTimeout(() => searchRef.current?.focus(), 200);
  }

  async function toggleChannelAlert(streamId: number, name: string) {
    const newSet = new Set(channelAlerts);
    if (newSet.has(streamId)) {
      newSet.delete(streamId);
    } else {
      newSet.add(streamId);
    }
    setChannelAlerts(newSet);
    await AsyncStorage.setItem("channel_alerts", JSON.stringify(Array.from(newSet)));
  }

  const recentlyAdded = useMemo(() => [
    ...(homeData?.recentMovies || []).slice(0, 15).map(m => ({ ...m, _tab: "movies" })),
    ...(homeData?.recentSeries || []).slice(0, 15).map(s => ({ ...s, _tab: "series" })),
  ], [homeData]);

  const smartRecommendations = useMemo(() => {
    if (recentlyWatched.length === 0 || !homeData) return [];
    const catCounts: Record<string, number> = {};
    for (const w of recentlyWatched) {
      const cat = w.category_id || "0";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const watched = new Set(recentlyWatched.map(i => i.stream_id ?? i.series_id));
    const pool = [
      ...(homeData.recentMovies || []).map(m => ({ ...m, _tab: "movies" })),
      ...(homeData.recentSeries || []).map(s => ({ ...s, _tab: "series" })),
    ];
    return pool
      .filter(i => i.category_id === topCat && !watched.has(i.stream_id ?? i.series_id))
      .slice(0, 20);
  }, [recentlyWatched, homeData]);

  const moodResults = useMemo(() => {
    if (!selectedMood || !homeData) return [];
    const mood = MOODS.find(m => m.key === selectedMood)!;
    const pool = [
      ...(homeData.recentMovies || []).map(m => ({ ...m, _tab: "movies" })),
      ...(homeData.recentSeries || []).map(s => ({ ...s, _tab: "series" })),
    ];
    return pool
      .filter(i => mood.keywords.some(kw => i.name.toLowerCase().includes(kw) || (i.category_id || "").includes(kw)))
      .slice(0, 20);
  }, [selectedMood, homeData]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const q = encodeURIComponent(search.trim());
        const searchTab = tab === "home" ? "movies" : tab;
        const endpoint =
          searchTab === "live" ? `${API_BASE}/api/live/streams?search=${q}&limit=60` :
          searchTab === "series" ? `${API_BASE}/api/series/list?search=${q}&limit=60` :
          `${API_BASE}/api/vod/streams?search=${q}&limit=60`;
        const r = await fetch(endpoint);
        const j = await r.json();
        setSearchResults((j.data || []).slice(0, 60));
      } catch {}
      finally {
        setSearchLoading(false);
      }
    }, 400);
  }, [search, tab]);

  function openItem(item: StreamItem, itemTab: ContentTab) {
    if (itemTab === "series") {
      router.push({
        pathname: "/(home)/series-detail",
        params: {
          id: String(item.series_id ?? item.stream_id),
          title: item.name,
          cover: item.cover || item.stream_icon || "",
        },
      });
    } else if (itemTab === "movies") {
      router.push({
        pathname: "/(home)/movie-detail",
        params: {
          id: String(item.stream_id),
          title: item.name,
          cover: item.cover || item.stream_icon || "",
          ext: item.container_extension || "mp4",
          rating: String(item.rating || "0"),
        },
      });
    } else {
      const url = `${API_BASE}/api/proxy/live/${item.stream_id}?format=m3u8`;
      const itemPayload = { ...item, _tab: itemTab };
      router.push({
        pathname: "/(home)/player",
        params: {
          url: encodeURIComponent(url),
          title: item.name,
          itemData: encodeURIComponent(JSON.stringify(itemPayload)),
        },
      });
    }
  }

  function openCategory(cat: Category) {
    router.push({
      pathname: "/(home)/category-content",
      params: { catId: cat.category_id, catName: cat.category_name, tab },
    });
  }

  const pt = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: pt }]}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>ANGEL</Text>
          <Text style={styles.logoPro}> TV pro</Text>
        </View>

        <View style={styles.tabs}>
          {TABS.map((t, i) => (
            <Pressable
              key={t.key}
              focusable
              hasTVPreferredFocus={i === 0}
              onPress={() => {
                setTab(t.key);
                setSearch("");
                setSelectedMood(null);
              }}
              style={({ focused }) => [
                styles.tabBtn,
                tab === t.key && styles.tabBtnActive,
                focused && styles.tabBtnFocused,
              ]}
            >
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            focusable
            onPress={() => setShowMoodPicker(v => !v)}
            style={({ focused }) => [
              styles.moodBtn,
              showMoodPicker && styles.moodBtnActive,
              focused && styles.moodBtnFocused,
            ]}
          >
            <Text style={styles.moodBtnText}>
              {selectedMood ? MOODS.find(m => m.key === selectedMood)?.emoji : "🎭"}
            </Text>
          </Pressable>

          <Pressable
            focusable
            onPress={() => router.push("/(home)/my-subscription")}
            style={({ focused }) => [styles.mySubBtn, focused && styles.mySubBtnFocused]}
          >
            <Text style={styles.mySubBtnText}>اشتراكي</Text>
          </Pressable>

          <Pressable
            focusable
            onPress={() => router.push("/(home)/family-vote")}
            style={({ focused }) => [styles.settingsBtn, focused && styles.settingsBtnFocused]}
          >
            <Text style={styles.settingsBtnText}>👨‍👩‍👧</Text>
          </Pressable>

          <Pressable
            focusable
            onPress={() => router.push("/(home)/settings")}
            style={({ focused }) => [styles.settingsBtn, focused && styles.settingsBtnFocused]}
          >
            <Text style={styles.settingsBtnText}>⚙</Text>
          </Pressable>

          <View style={styles.searchWrap}>
            <Animated.View style={{ transform: [{ scale: micPulse }] }}>
              <Pressable
                focusable
                onPress={activateMicSearch}
                style={({ focused }) => [styles.micBtn, focused && styles.micBtnFocused]}
              >
                <Text style={styles.micIcon}>🎤</Text>
              </Pressable>
            </Animated.View>

            <TextInput
              ref={searchRef}
              value={search}
              onChangeText={setSearch}
              placeholder="بحث..."
              placeholderTextColor="#666"
              style={styles.searchInput}
              focusable={false}
            />
          </View>
        </View>
      </View>

      {showMoodPicker && (
        <View style={styles.moodBar}>
          <Text style={styles.moodBarTitle}>كيف مزاجك؟</Text>
          {MOODS.map(m => (
            <Pressable
              key={m.key}
              focusable
              onPress={() => {
                setSelectedMood(selectedMood === m.key ? null : m.key);
                setTab("home");
                setShowMoodPicker(false);
              }}
              style={({ focused }) => [
                styles.moodChip,
                selectedMood === m.key && styles.moodChipActive,
                focused && styles.moodChipFocused,
              ]}
            >
              <Text style={styles.moodChipEmoji}>{m.emoji}</Text>
              <Text style={[styles.moodChipLabel, selectedMood === m.key && styles.moodChipLabelActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
          {selectedMood && (
            <Pressable focusable onPress={() => setSelectedMood(null)} style={styles.moodClear}>
              <Text style={styles.moodClearText}>✕ إلغاء</Text>
            </Pressable>
          )}
        </View>
      )}

      {notification && (
        <Pressable
          focusable
          onPress={dismissNotification}
          style={({ focused }) => [styles.notifBanner, focused && styles.bannerFocused]}
        >
          <View style={styles.notifContent}>
            <Text style={styles.notifTitle}>{notification.title}</Text>
            <Text style={styles.notifMsg} numberOfLines={1}>
              {notification.message}
            </Text>
          </View>
          <Text style={styles.notifClose}>✕</Text>
        </Pressable>
      )}

      {subWarning && !notification && (
        <Pressable
          focusable
          onPress={() => router.push("/(home)/my-subscription")}
          style={({ focused }) => [styles.warningBanner, focused && styles.bannerFocused]}
        >
          <Text style={styles.warningText}>⚠ {subWarning} — اضغط للتفاصيل</Text>
        </Pressable>
      )}

      {search.trim() ? (
        searchLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>يبحث...</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={it => String(it.stream_id ?? it.series_id ?? it.name)}
            numColumns={9}
            key="search-9"
            contentContainerStyle={styles.gridPad}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={27}
            windowSize={5}
            ListHeaderComponent={
              <Text style={styles.searchResultsHeader}>
                نتائج "{search}" — {searchResults.length} نتيجة
              </Text>
            }
            renderItem={({ item, index }) => (
              <PosterCard
                item={item}
                variant="poster"
                hasTVPreferredFocus={index === 0}
                onSelect={() => openItem(item, (item as any)._tab || (tab === "home" ? "movies" : tab))}
              />
            )}
          />
        )
      ) : tab === "home" ? (
        <HomeTab
          recentlyWatched={recentlyWatched}
          watchlist={watchlist}
          mostWatched={mostWatched}
          recentlyAdded={recentlyAdded}
          smartRecommendations={smartRecommendations}
          moodResults={moodResults}
          selectedMood={selectedMood}
          openItem={openItem}
          loading={homeLoading}
        />
      ) : tab === "live" ? (
        <CategoryListTab
          cats={cats}
          loading={homeLoading}
          tabName="جميع القنوات"
          onSelectCategory={openCategory}
          onSelectAll={() => router.push({ pathname: "/(home)/category-content", params: { catId: "all", catName: "جميع القنوات", tab } })}
          isLive
          channelAlerts={channelAlerts}
          onToggleAlert={toggleChannelAlert}
        />
      ) : (
        <CategoryListTab
          cats={cats}
          loading={homeLoading}
          tabName={tab === "movies" ? "جميع الأفلام" : "جميع المسلسلات"}
          onSelectCategory={openCategory}
          onSelectAll={() =>
            router.push({
              pathname: "/(home)/category-content",
              params: { catId: "all", catName: tab === "movies" ? "جميع الأفلام" : "جميع المسلسلات", tab },
            })
          }
        />
      )}
    </View>
  );
}

function HomeRow({
  id,
  title,
  data,
  isFirst,
  loading,
  accentColor,
  openItem,
  styles,
  onRowFocus,
}: {
  id: string;
  title: string;
  data: StreamItem[];
  isFirst?: boolean;
  loading?: boolean;
  accentColor: string;
  openItem: (item: StreamItem, tab: ContentTab) => void;
  styles: any;
  onRowFocus?: () => void;
}) {
  const rowRef = useRef<FlatList<StreamItem>>(null);

  if (!loading && data.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccentBar, { backgroundColor: accentColor }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={accentColor} style={{ marginLeft: 16, marginTop: 8 }} />
      ) : (
        <FlatList
          ref={rowRef}
          horizontal
          data={data}
          keyExtractor={i => `${id}-${i.stream_id ?? i.series_id ?? i.name}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          onScrollToIndexFailed={({ index }) => {
            rowRef.current?.scrollToOffset({
              offset: Math.max(index * 118, 0),
              animated: true,
            });
          }}
          renderItem={({ item, index }) => (
            <PosterCard
              item={item}
              variant="poster"
              hasTVPreferredFocus={index === 0 && !!isFirst}
              onFocus={() => {
                onRowFocus?.();
                rowRef.current?.scrollToIndex({
                  index,
                  animated: true,
                  viewPosition: 0.35,
                });
              }}
              onSelect={() => openItem(item, (item as any)._tab || "movies")}
            />
          )}
        />
      )}
    </View>
  );
}

function HomeTab({
  recentlyWatched,
  watchlist,
  mostWatched,
  recentlyAdded,
  smartRecommendations,
  moodResults,
  selectedMood,
  openItem,
  loading,
}: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const mood = MOODS.find((m: any) => m.key === selectedMood);
  const listRef = useRef<FlatList<any>>(null);

  const firstNonEmpty =
    recentlyWatched.length > 0 ? "recent" :
    smartRecommendations.length > 0 ? "smart" :
    mostWatched.length > 0 ? "most" :
    selectedMood && moodResults.length > 0 ? "mood" :
    "new";

  const sections = [
    selectedMood && moodResults.length > 0
      ? {
          id: "mood",
          title: `${mood?.emoji || "🎭"} محتوى ${mood?.label || ""}`,
          data: moodResults,
          isFirst: firstNonEmpty === "mood",
        }
      : null,
    {
      id: "smart",
      title: "🧠 مقترح لك",
      data: smartRecommendations,
      isFirst: firstNonEmpty === "smart",
    },
    {
      id: "recent",
      title: "▶ شاهدت مؤخراً",
      data: recentlyWatched,
      isFirst: firstNonEmpty === "recent",
    },
    {
      id: "most",
      title: "🔥 الأكثر مشاهدة",
      data: mostWatched,
      isFirst: firstNonEmpty === "most",
    },
    {
      id: "watchlist",
      title: "🔖 قائمة المشاهدة",
      data: watchlist,
      isFirst: false,
    },
    {
      id: "new",
      title: "✨ أضيف حديثاً",
      data: recentlyAdded,
      isFirst: firstNonEmpty === "new",
      loading,
    },
  ].filter(Boolean);

  return (
    <FlatList
      ref={listRef}
      data={sections}
      keyExtractor={(item: any) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      onScrollToIndexFailed={({ index }) => {
        listRef.current?.scrollToOffset({
          offset: Math.max(index * 240, 0),
          animated: true,
        });
      }}
      renderItem={({ item, index }) => (
        <HomeRow
          id={item.id}
          title={item.title}
          data={item.data}
          isFirst={item.isFirst}
          loading={item.loading}
          accentColor={colors.accent}
          openItem={openItem}
          styles={styles}
          onRowFocus={() => {
            listRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.12,
            });
          }}
        />
      )}
    />
  );
}

function CategoryListTab({ cats, loading, tabName, onSelectCategory, onSelectAll, isLive }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }
  const icon = isLive ? "📡" : tabName.includes("أفلام") ? "🎬" : "🎭";
  return (
    <FlatList
      data={cats}
      keyExtractor={(c: Category) => c.category_id}
      showsVerticalScrollIndicator={false}
      numColumns={3}
      key="cats-3"
      contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 40 }}
      columnWrapperStyle={{ gap: 8 }}
      removeClippedSubviews
      maxToRenderPerBatch={18}
      windowSize={5}
      ListHeaderComponent={
        <Pressable
          focusable
          onPress={onSelectAll}
          style={({ focused }) => [styles.catCard, styles.catCardAll, focused && styles.catCardFocused]}
          hasTVPreferredFocus
        >
          <Text style={styles.catCardIcon}>{icon}</Text>
          <Text style={styles.catCardName}>{tabName}</Text>
          <Text style={styles.catCardArrow}>عرض الكل ←</Text>
        </Pressable>
      }
      renderItem={({ item: cat, index }: { item: Category; index: number }) => (
        <Pressable
          focusable
          onPress={() => onSelectCategory(cat)}
          style={({ focused }) => [styles.catCard, focused && styles.catCardFocused]}
        >
          <Text style={styles.catCardIcon}>
            {isLive ? "📡" : index % 3 === 0 ? "🎬" : index % 3 === 1 ? "⭐" : "🍿"}
          </Text>
          <Text style={styles.catCardName} numberOfLines={2}>
            {cat.category_name}
          </Text>
          <Text style={styles.catCardArrow}>تصفح ←</Text>
        </Pressable>
      )}
    />
  );
}

type Colors = ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"];
function createStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingVertical: 8,
      backgroundColor: c.sidebar,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 10,
    },
    logoWrap: { flexDirection: "row", alignItems: "center", gap: 2, minWidth: 100 },
    logoText: { fontSize: 16, fontWeight: "900", color: "#fff", letterSpacing: 1 },
    logoPro: { fontSize: 9, fontWeight: "700", color: c.accent, marginBottom: 1 },
    tabs: { flexDirection: "row", gap: 4 },
    tabBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 3,
      borderColor: "transparent",
    },
    tabBtnActive: { backgroundColor: c.accent },
    tabBtnFocused: {
      borderColor: "#fff",
      backgroundColor: "rgba(255,255,255,0.18)",
      transform: [{ scale: 1.08 }],
    },
    tabLabel: { color: "#aaa", fontSize: 12, fontWeight: "700" },
    tabLabelActive: { color: "#111" },
    headerActions: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
    moodBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.06)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    moodBtnActive: { borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.15)" },
    moodBtnFocused: { borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.18)" },
    moodBtnText: { fontSize: 15 },
    mySubBtn: {
      backgroundColor: "rgba(255,255,255,0.08)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: "transparent",
    },
    mySubBtnFocused: { borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.18)" },
    mySubBtnText: { color: "#ddd", fontSize: 11, fontWeight: "700" },
    settingsBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.06)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    settingsBtnFocused: { borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.18)" },
    settingsBtnText: { fontSize: 14, color: "#aaa" },
    searchWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#1e1e10",
      borderRadius: 8,
      paddingHorizontal: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    micBtn: {
      padding: 4,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: "transparent",
    },
    micBtnFocused: {
      borderColor: "#fff",
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    micIcon: { fontSize: 14 },
    searchInput: {
      flex: 1,
      color: "#fff",
      fontSize: 14,
      paddingVertical: 9,
      textAlign: "right",
    },
    moodBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: "#0e0e07",
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      flexWrap: "wrap",
    },
    moodBarTitle: { color: "#888", fontSize: 13, fontWeight: "600" },
    moodChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: "#1a1a0d",
      borderWidth: 2,
      borderColor: "transparent",
    },
    moodChipActive: { backgroundColor: c.accent, borderColor: c.accent },
    moodChipFocused: { borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.12)" },
    moodChipEmoji: { fontSize: 16 },
    moodChipLabel: { color: "#888", fontSize: 12, fontWeight: "600" },
    moodChipLabelActive: { color: "#111" },
    moodClear: { paddingHorizontal: 10, paddingVertical: 6 },
    moodClearText: { color: "#888", fontSize: 12 },
    notifBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#1a3a1a",
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#2a5a2a",
      gap: 12,
    },
    notifContent: { flex: 1 },
    notifTitle: { color: "#4ade80", fontSize: 13, fontWeight: "700" },
    notifMsg: { color: "#86efac", fontSize: 12 },
    notifClose: { color: "#4ade80", fontSize: 18, paddingHorizontal: 8 },
    warningBanner: {
      backgroundColor: "rgba(239,68,68,0.15)",
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(239,68,68,0.3)",
    },
    bannerFocused: {
      borderColor: "#fff",
      borderWidth: 2,
    },
    warningText: { color: "#fca5a5", fontSize: 13, fontWeight: "600" },
    gridPad: { paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 28 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadingText: { color: "#aaa", fontSize: 14 },
    section: { marginBottom: 2 },
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 4,
      gap: 8,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 10,
      paddingBottom: 4,
      paddingLeft: 12,
    },
    sectionAccentBar: { width: 3, height: 14, borderRadius: 2, marginRight: 8 },
    sectionTitle: { color: "#e8e8e8", fontSize: 13, fontWeight: "700" },
    sectionSub: { color: c.accent, fontSize: 11 },
    searchResultsHeader: {
      color: c.accent,
      fontSize: 13,
      fontWeight: "600",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    moodActiveBadge: {
      backgroundColor: c.accent,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    moodActiveBadgeText: { color: "#111", fontSize: 10, fontWeight: "700" },
    catCard: {
      flex: 1,
      flexDirection: "column",
      alignItems: "flex-end",
      backgroundColor: c.card,
      borderRadius: 8,
      marginBottom: 7,
      padding: 11,
      borderWidth: 2,
      borderColor: "transparent",
      minHeight: 70,
    },
    catCardAll: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 7,
      minHeight: 48,
    },
    catCardFocused: {
      borderColor: "#ffffff",
      backgroundColor: "rgba(255,255,255,0.1)",
      transform: [{ scale: 1.04 }],
    },
    catCardIcon: { fontSize: 20, marginBottom: 5 },
    catCardName: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      flex: 1,
    },
    catCardArrow: { color: "#aaa", fontSize: 10, fontWeight: "600", marginTop: 3 },
  });
}
