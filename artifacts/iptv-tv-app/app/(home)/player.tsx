import React, { useRef, useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import colors from "@/constants/colors";
import { addToRecentlyWatched } from "@/hooks/useApi";
import { saveResumePosition, getResumePosition, incrementWatchCount } from "@/hooks/storage";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const INTRO_DURATION_MS = 120000;
const SEEK_SEC = 30;

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
  const [seekFeedback, setSeekFeedback] = useState<string | null>(null);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (seekFeedbackTimer.current) clearTimeout(seekFeedbackTimer.current);
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


  function showSeekFeedback(msg: string) {
    setSeekFeedback(msg);
    if (seekFeedbackTimer.current) clearTimeout(seekFeedbackTimer.current);
    seekFeedbackTimer.current = setTimeout(() => setSeekFeedback(null), 1200);
    resetHideTimer();
  }

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
    hideTimer.current = setTimeout(() => setShowControls(false), 6000);
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

      {/* Seek feedback toast */}
      {seekFeedback && (
        <View style={styles.seekFeedback} pointerEvents="none">
          <Text style={styles.seekFeedbackText}>{seekFeedback}</Text>
        </View>
      )}

      {/* Resume prompt */}
      {showResumePrompt && (
        <View style={styles.overlay}>
          <View style={styles.resumeCard}>
            <Text style={styles.resumeTitle}>استكمال المشاهدة؟</Text>
            <Text style={styles.resumeSub}>آخر موضع: {fmtTime(resumeMs || 0)}</Text>
            <View style={styles.resumeBtns}>
              <Pressable
                onPress={() => handleResume(true)}
                hasTVPreferredFocus
                style={({ focused }) => [styles.resumeBtn, styles.resumeBtnPrimary, focused && styles.resumeBtnFocused]}
              >
                {({ focused }) => (
                  <Text style={[styles.resumeBtnTextPrimary, focused && { fontSize: 18 }]}>استكمال ▶</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => handleResume(false)}
                style={({ focused }) => [styles.resumeBtn, focused && styles.resumeBtnFocused]}
              >
                {({ focused }) => (
                  <Text style={[styles.resumeBtnText, focused && { color: "#fff" }]}>من البداية ↺</Text>
                )}
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
          <Pressable
            onPress={() => router.back()}
            style={({ focused }) => [styles.errorBtn, focused && styles.errorBtnFocused]}
            hasTVPreferredFocus
          >
            <Text style={styles.errorBtnText}>← رجوع</Text>
          </Pressable>
        </View>
      )}

      {/* Speed menu */}
      {showSpeedMenu && (
        <View style={styles.speedMenu}>
          <Text style={styles.speedMenuTitle}>سرعة التشغيل</Text>
          {SPEEDS.map((s, i) => (
            <Pressable
              key={s}
              onPress={() => setPlaybackSpeed(s)}
              hasTVPreferredFocus={i === 2}
              style={({ focused }) => [
                styles.speedItem,
                s === speed && styles.speedItemActive,
                focused && styles.speedItemFocused,
              ]}
            >
              {({ focused }) => (
                <Text style={[styles.speedItemText, s === speed && styles.speedItemTextActive, focused && { color: "#fff" }]}>
                  {s === 1 ? "عادي ✓" : `${s}x`}
                </Text>
              )}
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
          style={({ focused }) => [styles.skipIntroBtn, focused && styles.skipIntroBtnFocused]}
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
              style={({ focused }) => [styles.topBtn, focused && styles.topBtnFocused]}
            >
              {({ focused }) => (
                <Text style={[styles.topBtnText, focused && styles.topBtnTextFocused]}>← رجوع</Text>
              )}
            </Pressable>
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
            <Pressable
              onPress={() => { setShowSpeedMenu(v => !v); resetHideTimer(); }}
              style={({ focused }) => [styles.topBtn, focused && styles.topBtnFocused]}
            >
              {({ focused }) => (
                <Text style={[styles.topBtnText, focused && styles.topBtnTextFocused]}>
                  {speed === 1 ? "⚙ السرعة" : `⚙ ${speed}x`}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.bottomSection}>
            {durationMs > 0 && (
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
                <Text style={styles.timeText}>{fmtTime(durationMs)}</Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <Pressable
                onPress={() => { seek(-SEEK_SEC); showSeekFeedback(`⏪ -${SEEK_SEC}ث`); }}
                style={({ focused }) => [styles.controlBtn, focused && styles.controlBtnFocused]}
              >
                {({ focused }) => (
                  <Text style={[styles.controlBtnText, focused && styles.controlBtnTextFocused]}>
                    ⏪ {SEEK_SEC}ث
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={togglePlay}
                style={({ focused }) => [styles.playBtn, focused && styles.playBtnFocused]}
              >
                {({ focused }) => (
                  <Text style={[styles.playBtnText, focused && { fontSize: 34 }]}>
                    {status === "playing" ? "⏸" : "▶"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => { seek(SEEK_SEC); showSeekFeedback(`⏩ +${SEEK_SEC}ث`); }}
                style={({ focused }) => [styles.controlBtn, focused && styles.controlBtnFocused]}
              >
                {({ focused }) => (
                  <Text style={[styles.controlBtnText, focused && styles.controlBtnTextFocused]}>
                    {SEEK_SEC}ث ⏩
                  </Text>
                )}
              </Pressable>
            </View>

            {Platform.isTV && (
              <Text style={styles.tvHint}>
                ◀▶ للتخطي {SEEK_SEC}ث  •  OK للتشغيل/إيقاف
              </Text>
            )}
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
  errorBtn: {
    backgroundColor: colors.accent, paddingHorizontal: 40, paddingVertical: 16,
    borderRadius: 12, marginTop: 12, borderWidth: 3, borderColor: "transparent",
  },
  errorBtnFocused: {
    borderColor: "#fff",
    shadowColor: "#fff",
    shadowOpacity: 0.8,
    shadowRadius: 16,
    transform: [{ scale: 1.06 }],
  },
  errorBtnText: { color: "#111", fontSize: 20, fontWeight: "900" },

  seekFeedback: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  seekFeedbackText: { color: "#fff", fontSize: 28, fontWeight: "900", textAlign: "center" },

  resumeCard: {
    backgroundColor: "#1a1a0d", borderRadius: 20, padding: 40,
    alignItems: "center", gap: 18, borderWidth: 2, borderColor: colors.accent, minWidth: 360,
  },
  resumeTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  resumeSub: { color: colors.accent, fontSize: 17 },
  resumeBtns: { flexDirection: "row", gap: 18, marginTop: 8 },
  resumeBtn: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.15)",
  },
  resumeBtnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  resumeBtnFocused: {
    borderColor: "#fff",
    shadowColor: "#fff",
    shadowOpacity: 0.7,
    shadowRadius: 14,
    transform: [{ scale: 1.07 }],
  },
  resumeBtnText: { color: "#ccc", fontSize: 17, fontWeight: "700" },
  resumeBtnTextPrimary: { color: "#111", fontSize: 17, fontWeight: "900" },

  speedMenu: {
    position: "absolute", top: 80, right: 20,
    backgroundColor: "#1a1a0d", borderRadius: 14, paddingVertical: 8,
    borderWidth: 2, borderColor: colors.border, zIndex: 100, minWidth: 160,
  },
  speedMenuTitle: { color: "#888", fontSize: 13, textAlign: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#2a2a18" },
  speedItem: { paddingVertical: 14, paddingHorizontal: 28, borderWidth: 3, borderColor: "transparent" },
  speedItemActive: { backgroundColor: "rgba(240,191,26,0.12)" },
  speedItemFocused: {
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.12)",
    transform: [{ scale: 1.03 }],
  },
  speedItemText: { color: "#ccc", fontSize: 16, textAlign: "center" },
  speedItemTextActive: { color: colors.accent, fontWeight: "900" },

  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 28, paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.8)", gap: 14,
  },
  topBtn: {
    backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 18,
    paddingVertical: 9, borderRadius: 10, borderWidth: 3, borderColor: "transparent",
    minWidth: 80, alignItems: "center",
  },
  topBtnFocused: {
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.22)",
    shadowColor: "#fff",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    transform: [{ scale: 1.06 }],
  },
  topBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  topBtnTextFocused: { color: "#fff", fontWeight: "900" },
  titleText: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "bold", textAlign: "center" },

  bottomSection: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 36, paddingTop: 16, paddingBottom: 32, gap: 18,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  timeText: { color: "#ccc", fontSize: 14, minWidth: 58, textAlign: "center" },
  progressTrack: { flex: 1, height: 32, justifyContent: "center" },
  progressBar: { height: 5, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, position: "relative", overflow: "visible" },
  progressFill: { height: 5, backgroundColor: colors.accent, borderRadius: 3 },
  progressThumb: { position: "absolute", top: -6, marginLeft: -8, width: 17, height: 17, borderRadius: 9, backgroundColor: colors.accent, shadowColor: colors.accentGlow, shadowOpacity: 1, shadowRadius: 8 },

  btnRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 32 },
  controlBtn: {
    backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 12, borderWidth: 3, borderColor: "transparent",
  },
  controlBtnFocused: {
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.2)",
    shadowColor: "#fff",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    transform: [{ scale: 1.08 }],
  },
  controlBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  controlBtnTextFocused: { fontWeight: "900" },
  playBtn: {
    backgroundColor: colors.accent, width: 76, height: 76,
    borderRadius: 38, alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "transparent",
  },
  playBtnFocused: {
    backgroundColor: "#fff",
    borderColor: "#fff",
    shadowColor: "#fff",
    shadowOpacity: 0.9,
    shadowRadius: 22,
    elevation: 20,
    transform: [{ scale: 1.12 }],
  },
  playBtnText: { color: "#111", fontSize: 30 },

  tvHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    textAlign: "center",
    marginTop: -8,
  },

  skipIntroBtn: {
    position: "absolute", bottom: 150, right: 44,
    backgroundColor: "rgba(0,0,0,0.88)",
    borderWidth: 3, borderColor: "#555",
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 10, zIndex: 50,
  },
  skipIntroBtnFocused: {
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.18)",
    shadowColor: "#fff",
    shadowOpacity: 0.7,
    shadowRadius: 12,
    transform: [{ scale: 1.06 }],
  },
  skipIntroText: { color: "#fff", fontSize: 17, fontWeight: "900" },
});
