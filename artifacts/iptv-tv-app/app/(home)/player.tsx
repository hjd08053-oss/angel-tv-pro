import React, { useRef, useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Modal, FlatList } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import colors from "@/constants/colors";
import { addToRecentlyWatched } from "@/hooks/useApi";
import { saveResumePosition, getResumePosition, incrementWatchCount } from "@/hooks/storage";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const INTRO_DURATION_MS = 120000;

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function PlayerScreen() {
  const { url, title, itemData, resumeKey } = useLocalSearchParams<{
    url: string; title: string; itemData?: string; resumeKey?: string;
  }>();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const addedToRecent = useRef(false);
  const watchCountedRef = useRef(false);
  const lastSavedPos = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<"loading" | "playing" | "paused" | "error">("loading");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [resumeMs, setResumeMs] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = resumeKey || url || "";

  useEffect(() => {
    if (key) {
      getResumePosition(key).then(pos => {
        if (pos && pos > 5000) {
          setResumeMs(pos);
          setShowResumePrompt(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearInterval(saveTimer.current);
    saveTimer.current = setInterval(() => {
      if (status === "playing" && durationMs > 0 && positionMs > 0) {
        saveResumePosition(key, positionMs, durationMs);
        lastSavedPos.current = positionMs;
      }
    }, 5000);
    return () => { if (saveTimer.current) clearInterval(saveTimer.current); };
  }, [status, positionMs, durationMs, key]);

  async function handleResume(yes: boolean) {
    setShowResumePrompt(false);
    if (yes && resumeMs && videoRef.current) {
      setTimeout(async () => {
        await videoRef.current?.setPositionAsync(resumeMs);
        setPositionMs(resumeMs);
        setResumed(true);
      }, 800);
    }
  }

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => setShowControls(false), 5000);
  }, []);

  const handleStatus = useCallback((s: AVPlaybackStatus) => {
    if (!s.isLoaded) {
      if ((s as any).error) setStatus("error");
      return;
    }
    const loaded = s as any;
    if (loaded.durationMillis && loaded.durationMillis > 0) setDurationMs(loaded.durationMillis);
    if (!isSeeking) setPositionMs(loaded.positionMillis || 0);

    if (loaded.isPlaying) {
      const pos = loaded.positionMillis || 0;
      const dur = loaded.durationMillis || 0;
      setShowSkipIntro(pos > 1000 && pos < INTRO_DURATION_MS && dur > INTRO_DURATION_MS);
      setStatus("playing");
      if (!addedToRecent.current && itemData) {
        try {
          addedToRecent.current = true;
          addToRecentlyWatched(JSON.parse(decodeURIComponent(itemData)));
        } catch {}
      }
      if (!watchCountedRef.current && loaded.positionMillis > 30000 && itemData) {
        try {
          watchCountedRef.current = true;
          incrementWatchCount(JSON.parse(decodeURIComponent(itemData)));
        } catch {}
      }
    } else if (loaded.isBuffering) setStatus("loading");
    else setStatus("paused");
  }, [isSeeking, itemData]);

  async function seek(seconds: number) {
    if (!videoRef.current) return;
    const s = await videoRef.current.getStatusAsync() as any;
    if (s.isLoaded) {
      const pos = Math.max(0, Math.min((s.positionMillis || 0) + seconds * 1000, durationMs || Infinity));
      setPositionMs(pos);
      await videoRef.current.setPositionAsync(pos);
      resetHideTimer();
    }
  }

  async function seekToPercent(pct: number) {
    if (!videoRef.current || durationMs <= 0) return;
    const pos = Math.floor(pct * durationMs);
    setPositionMs(pos);
    await videoRef.current.setPositionAsync(pos);
    resetHideTimer();
  }

  async function togglePlay() {
    if (!videoRef.current) return;
    if (status === "playing") {
      await videoRef.current.pauseAsync();
      setStatus("paused");
    } else {
      await videoRef.current.playAsync();
      setStatus("playing");
    }
    resetHideTimer();
  }

  async function setPlaybackSpeed(s: number) {
    setSpeed(s);
    setShowSpeedMenu(false);
    await videoRef.current?.setRateAsync(s, true);
    resetHideTimer();
  }

  async function toggleFullscreen() {
    if (!videoRef.current) return;
    if (isFullscreen) {
      await (videoRef.current as any).dismissFullscreenPlayer?.();
    } else {
      await (videoRef.current as any).presentFullscreenPlayer?.();
    }
    setIsFullscreen(!isFullscreen);
    resetHideTimer();
  }

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const decodedUrl = decodeURIComponent(url || "");

  return (
    <View style={styles.container}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => { setShowSpeedMenu(false); resetHideTimer(); }}>
        {decodedUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: decodedUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            rate={speed}
            useNativeControls={false}
            onPlaybackStatusUpdate={handleStatus}
            onFullscreenUpdate={({ fullscreenUpdate }) => {
              setIsFullscreen(fullscreenUpdate === 1 || fullscreenUpdate === 2);
            }}
          />
        ) : null}
      </Pressable>

      {/* Resume prompt */}
      {showResumePrompt && (
        <View style={styles.overlay}>
          <View style={styles.resumeCard}>
            <Text style={styles.resumeTitle}>استكمال المشاهدة</Text>
            <Text style={styles.resumeSub}>آخر موضع: {fmtTime(resumeMs || 0)}</Text>
            <View style={styles.resumeBtns}>
              <Pressable
                onPress={() => handleResume(true)}
                hasTVPreferredFocus
                style={({ focused }) => [styles.resumeBtn, styles.resumeBtnPrimary, (focused as boolean) && styles.resumeBtnFocused]}
              >
                <Text style={styles.resumeBtnTextPrimary}>استكمال ▶</Text>
              </Pressable>
              <Pressable
                onPress={() => handleResume(false)}
                style={({ focused }) => [styles.resumeBtn, (focused as boolean) && styles.resumeBtnFocused]}
              >
                <Text style={styles.resumeBtnText}>من البداية</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Loading overlay */}
      {status === "loading" && !showResumePrompt && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      )}

      {/* Error overlay */}
      {status === "error" && (
        <View style={styles.overlay}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorText}>تعذر تشغيل البث</Text>
          <Pressable onPress={() => router.back()} style={styles.errorBtn} hasTVPreferredFocus>
            <Text style={styles.errorBtnText}>← رجوع</Text>
          </Pressable>
        </View>
      )}

      {/* Speed menu */}
      {showSpeedMenu && (
        <View style={styles.speedMenu}>
          <Text style={styles.speedMenuTitle}>سرعة التشغيل</Text>
          {SPEEDS.map(s => (
            <Pressable
              key={s}
              onPress={() => setPlaybackSpeed(s)}
              style={({ focused }) => [styles.speedItem, s === speed && styles.speedItemActive, (focused as boolean) && styles.speedItemFocused]}
            >
              <Text style={[styles.speedItemText, s === speed && styles.speedItemTextActive]}>
                {s === 1 ? "عادي" : `${s}x`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Skip Intro */}
      {showSkipIntro && !showResumePrompt && (
        <Pressable
          onPress={async () => {
            setShowSkipIntro(false);
            await videoRef.current?.setPositionAsync(INTRO_DURATION_MS);
            setPositionMs(INTRO_DURATION_MS);
          }}
          style={({ focused }) => [styles.skipIntroBtn, (focused as boolean) && styles.skipIntroBtnFocused]}
        >
          <Text style={styles.skipIntroText}>تخطي المقدمة ⏭</Text>
        </Pressable>
      )}

      {/* Controls */}
      {showControls && status !== "error" && !showResumePrompt && (
        <>
          <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
            <Pressable
              onPress={() => router.back()}
              hasTVPreferredFocus
              style={({ focused }) => [styles.topBtn, (focused as boolean) && styles.topBtnFocused]}
            >
              <Text style={styles.topBtnText}>← رجوع</Text>
            </Pressable>
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
            <Pressable
              onPress={() => { setShowSpeedMenu(v => !v); resetHideTimer(); }}
              style={({ focused }) => [styles.topBtn, (focused as boolean) && styles.topBtnFocused]}
            >
              <Text style={styles.topBtnText}>{speed === 1 ? "السرعة" : `${speed}x`}</Text>
            </Pressable>
            <Pressable
              onPress={toggleFullscreen}
              style={({ focused }) => [styles.topBtn, (focused as boolean) && styles.topBtnFocused]}
            >
              <Text style={styles.topBtnText}>{isFullscreen ? "⊡" : "⛶"}</Text>
            </Pressable>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.progressRow}>
              <Text style={styles.timeText}>{fmtTime(positionMs)}</Text>
              <Pressable
                style={styles.progressTrack}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent as any;
                  (e.target as any)?.measure?.((x: number, y: number, width: number) => {
                    if (width > 0) seekToPercent(locationX / width);
                  });
                }}
              >
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                  <View style={[styles.progressThumb, { left: `${Math.min(progress * 100, 100)}%` }]} />
                </View>
              </Pressable>
              <Text style={styles.timeText}>{durationMs > 0 ? fmtTime(durationMs) : "--:--"}</Text>
            </View>

            <View style={styles.btnRow}>
              <Pressable
                onPress={() => seek(-30)}
                style={({ focused }) => [styles.controlBtn, (focused as boolean) && styles.controlBtnFocused]}
              >
                <Text style={styles.controlBtnText}>⏪ 30ث</Text>
              </Pressable>

              <Pressable
                onPress={togglePlay}
                style={({ focused }) => [styles.playBtn, (focused as boolean) && styles.playBtnFocused]}
              >
                <Text style={styles.playBtnText}>{status === "playing" ? "⏸" : "▶"}</Text>
              </Pressable>

              <Pressable
                onPress={() => seek(30)}
                style={({ focused }) => [styles.controlBtn, (focused as boolean) && styles.controlBtnFocused]}
              >
                <Text style={styles.controlBtnText}>30ث ⏩</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  loadingText: { color: "#fff", fontSize: 18 },
  errorIcon: { fontSize: 52, color: "#ef4444" },
  errorText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  errorBtn: { backgroundColor: colors.accent, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 10, marginTop: 12 },
  errorBtnText: { color: "#111", fontSize: 18, fontWeight: "bold" },

  resumeCard: {
    backgroundColor: "#1a1a0d",
    borderRadius: 16,
    padding: 36,
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    minWidth: 340,
  },
  resumeTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  resumeSub: { color: colors.accent, fontSize: 16 },
  resumeBtns: { flexDirection: "row", gap: 16, marginTop: 8 },
  resumeBtn: {
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.15)",
  },
  resumeBtnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  resumeBtnFocused: { borderColor: "#fff", shadowColor: colors.accentGlow, shadowOpacity: 1, shadowRadius: 10 },
  resumeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resumeBtnTextPrimary: { color: "#111", fontSize: 16, fontWeight: "900" },

  speedMenu: {
    position: "absolute",
    top: 80,
    right: 20,
    backgroundColor: "#1a1a0d",
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 100,
    minWidth: 140,
  },
  speedMenuTitle: { color: "#888", fontSize: 12, textAlign: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#2a2a18" },
  speedItem: { paddingVertical: 12, paddingHorizontal: 24, borderWidth: 2, borderColor: "transparent" },
  speedItemActive: { backgroundColor: "rgba(240,191,26,0.1)" },
  speedItemFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.12)" },
  speedItemText: { color: "#ccc", fontSize: 15, textAlign: "center" },
  speedItemTextActive: { color: colors.accent, fontWeight: "700" },

  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 24, paddingBottom: 18,
    backgroundColor: "rgba(0,0,0,0.75)", gap: 12,
  },
  topBtn: {
    backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 16,
    paddingVertical: 7, borderRadius: 8, borderWidth: 2, borderColor: "transparent",
    minWidth: 70, alignItems: "center",
  },
  topBtnFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.2)" },
  topBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  titleText: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "bold", textAlign: "center" },

  bottomSection: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 32, paddingTop: 14, paddingBottom: 28, gap: 16,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeText: { color: "#ccc", fontSize: 14, minWidth: 52, textAlign: "center" },
  progressTrack: { flex: 1, height: 28, justifyContent: "center" },
  progressBar: { height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, position: "relative", overflow: "visible" },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  progressThumb: { position: "absolute", top: -5, marginLeft: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent, shadowColor: colors.accentGlow, shadowOpacity: 1, shadowRadius: 6 },

  btnRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 28 },
  controlBtn: {
    backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: "transparent",
  },
  controlBtnFocused: { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.18)" },
  controlBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  playBtn: {
    backgroundColor: colors.accent, width: 68, height: 68,
    borderRadius: 34, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "transparent",
  },
  playBtnFocused: { backgroundColor: "#fff", borderColor: "#fff", shadowColor: "#fff", shadowOpacity: 0.8, shadowRadius: 14 },
  playBtnText: { color: "#111", fontSize: 28 },

  skipIntroBtn: {
    position: "absolute",
    bottom: 140,
    right: 40,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderWidth: 2,
    borderColor: "#555",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 50,
  },
  skipIntroBtnFocused: {
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.2)",
    shadowColor: "#fff",
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  skipIntroText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
