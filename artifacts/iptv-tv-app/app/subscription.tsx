import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Animated,
  ActivityIndicator, Platform,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors from "@/constants/colors";
import { API_BASE } from "@/hooks/useApi";
import { getDeviceId } from "@/hooks/storage";

type Stage = "enter" | "loading" | "welcome" | "error";
type LoginMode = "code" | "account";

export default function SubscriptionScreen() {
  const [mode, setMode] = useState<LoginMode>("code");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<Stage>("enter");
  const [errMsg, setErrMsg] = useState("");
  const [subInfo, setSubInfo] = useState<{ label: string; expires_at: string | null; is_lifetime: boolean } | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (stage === "welcome") {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 100 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      Animated.spring(checkAnim, { toValue: 1, useNativeDriver: true, delay: 200, damping: 6 }).start();
      const t = setTimeout(() => router.replace("/(home)"), 4000);
      return () => clearTimeout(t);
    }
  }, [stage]);

  async function saveAndSuccess(j: any, codeValue: string) {
    await AsyncStorage.setItem("subscription", JSON.stringify({
      code: codeValue,
      expires_at: j.expires_at,
      label: j.label,
      is_lifetime: j.is_lifetime,
      days_left: j.days_left,
    }));
    setSubInfo({ label: j.label, expires_at: j.expires_at, is_lifetime: j.is_lifetime });
    setStage("welcome");
  }

  async function verifyByCode() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setErrMsg("أدخل كود الاشتراك"); setStage("error"); return; }
    setStage("loading");
    try {
      const deviceId = await getDeviceId();
      const r = await fetch(`${API_BASE}/api/subscriptions/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, device_id: deviceId, device_name: `TV-${Platform.OS}` }),
      });
      const j = await r.json();
      if (j.valid) {
        await saveAndSuccess(j, trimmed);
      } else {
        setErrMsg(j.error || "الكود غير صحيح");
        setStage("error");
      }
    } catch {
      setErrMsg("تعذر الاتصال بالخادم");
      setStage("error");
    }
  }

  async function verifyByAccount() {
    if (!username.trim() || !password.trim()) {
      setErrMsg("أدخل اسم المستخدم وكلمة المرور");
      setStage("error");
      return;
    }
    setStage("loading");
    try {
      const deviceId = await getDeviceId();
      const r = await fetch(`${API_BASE}/api/subscriptions/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          device_id: deviceId,
          device_name: `TV-${Platform.OS}`,
        }),
      });
      const j = await r.json();
      if (j.valid) {
        await saveAndSuccess(j, j.code);
      } else {
        setErrMsg(j.error || "بيانات الدخول غير صحيحة");
        setStage("error");
      }
    } catch {
      setErrMsg("تعذر الاتصال بالخادم");
      setStage("error");
    }
  }

  function submit() {
    if (stage === "error") setStage("enter");
    if (mode === "code") verifyByCode();
    else verifyByAccount();
  }

  function formatExpiry(dt: string | null) {
    if (!dt) return null;
    const d = new Date(dt);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  return (
    <View style={styles.root}>
      {stage === "welcome" && (
        <View style={styles.welcomeOverlay}>
          <Animated.View style={[styles.welcomeCard, { transform: [{ scale: scaleAnim }] }]}>
            <Animated.Text style={[styles.checkMark, { transform: [{ scale: checkAnim }] }]}>✓</Animated.Text>
            <Animated.View style={{ opacity: fadeAnim, alignItems: "center", gap: 10 }}>
              <Text style={styles.welcomeTitle}>تم اشتراكك معنا!</Text>
              <Text style={styles.welcomeSub}>مرحباً بك في ANGEL TV pro</Text>
              {subInfo?.is_lifetime ? (
                <Text style={styles.welcomeDuration}>اشتراك مدى الحياة ♾</Text>
              ) : subInfo?.expires_at ? (
                <Text style={styles.welcomeDuration}>ينتهي في {formatExpiry(subInfo.expires_at)}</Text>
              ) : null}
            </Animated.View>
          </Animated.View>
        </View>
      )}

      {stage !== "welcome" && (
        <View style={styles.container}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>ANGEL</Text>
            <Text style={styles.logoPro}> TV pro</Text>
          </View>
          <Text style={styles.appSubtitle}>تلفازك بدون حدود</Text>

          <View style={styles.card}>
            {/* Mode tabs */}
            <View style={styles.modeTabs}>
              <Pressable
                onPress={() => { setMode("code"); setStage("enter"); }}
                style={({ focused }) => [
                  styles.modeTab,
                  mode === "code" && styles.modeTabActive,
                  focused && styles.modeTabFocused,
                ]}
              >
                {({ focused }) => (
                  <Text style={[
                    styles.modeTabText,
                    mode === "code" && styles.modeTabTextActive,
                    focused && styles.modeTabTextFocused,
                  ]}>بالكود</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => { setMode("account"); setStage("enter"); }}
                style={({ focused }) => [
                  styles.modeTab,
                  mode === "account" && styles.modeTabActive,
                  focused && styles.modeTabFocused,
                ]}
              >
                {({ focused }) => (
                  <Text style={[
                    styles.modeTabText,
                    mode === "account" && styles.modeTabTextActive,
                    focused && styles.modeTabTextFocused,
                  ]}>بالحساب</Text>
                )}
              </Pressable>
            </View>

            {mode === "code" ? (
              <>
                <Text style={styles.cardTitle}>أدخل كود الاشتراك</Text>
                <Text style={styles.cardSub}>للحصول على كود تواصل مع مالك السيرفر</Text>
                <View style={[
                  styles.inputWrap,
                  stage === "error" && styles.inputWrapError,
                  focusedInput === "code" && styles.inputWrapFocused,
                ]}>
                  <TextInput
                    value={code}
                    onChangeText={t => { setCode(t); if (stage === "error") setStage("enter"); }}
                    placeholder="ANGEL-XXXX-XXXX"
                    placeholderTextColor="#555"
                    autoCapitalize="characters"
                    style={styles.input}
                    editable={stage !== "loading"}
                    onFocus={() => setFocusedInput("code")}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>تسجيل الدخول بحساب</Text>
                <Text style={styles.cardSub}>أدخل اسم المستخدم وكلمة المرور</Text>
                <View style={[
                  styles.inputWrap,
                  stage === "error" && styles.inputWrapError,
                  focusedInput === "username" && styles.inputWrapFocused,
                ]}>
                  <TextInput
                    value={username}
                    onChangeText={t => { setUsername(t); if (stage === "error") setStage("enter"); }}
                    placeholder="اسم المستخدم"
                    placeholderTextColor="#555"
                    autoCapitalize="none"
                    style={styles.input}
                    editable={stage !== "loading"}
                    onFocus={() => setFocusedInput("username")}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
                <View style={[
                  styles.inputWrap,
                  stage === "error" && styles.inputWrapError,
                  focusedInput === "password" && styles.inputWrapFocused,
                ]}>
                  <TextInput
                    value={password}
                    onChangeText={t => { setPassword(t); if (stage === "error") setStage("enter"); }}
                    placeholder="كلمة المرور"
                    placeholderTextColor="#555"
                    secureTextEntry
                    style={styles.input}
                    editable={stage !== "loading"}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </>
            )}

            {stage === "error" && <Text style={styles.errorMsg}>⚠ {errMsg}</Text>}

            {stage === "loading" ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.loadingText}>جاري التحقق...</Text>
              </View>
            ) : (
              <Pressable
                onPress={submit}
                hasTVPreferredFocus
                style={({ focused }) => [styles.btn, focused && styles.btnFocused]}
              >
                {({ focused }) => (
                  <Text style={[styles.btnText, focused && styles.btnTextFocused]}>
                    {mode === "code" ? "✓ تحقق من الكود" : "→ دخول"}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, paddingHorizontal: 40 },
  logoWrap: { flexDirection: "row", alignItems: "flex-end" },
  logoText: { fontSize: 52, fontWeight: "900", color: "#fff", letterSpacing: 2 },
  logoPro: { fontSize: 24, fontWeight: "700", color: colors.accent, marginBottom: 8 },
  appSubtitle: { color: "#666", fontSize: 16, marginTop: -12 },

  card: {
    backgroundColor: colors.card, borderRadius: 20, padding: 40,
    alignItems: "center", gap: 16, width: "100%", maxWidth: 500,
    borderWidth: 1, borderColor: colors.border,
  },
  modeTabs: { flexDirection: "row", gap: 10, marginBottom: 4 },
  modeTab: {
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10,
    borderWidth: 3, borderColor: "transparent", backgroundColor: "#111108",
  },
  modeTabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  modeTabFocused: {
    borderColor: "#ffffff",
    shadowColor: "#fff",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    transform: [{ scale: 1.06 }],
  },
  modeTabText: { color: "#888", fontSize: 16, fontWeight: "700" },
  modeTabTextActive: { color: "#111" },
  modeTabTextFocused: { color: "#fff" },

  cardTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  cardSub: { color: "#888", fontSize: 13, textAlign: "center", lineHeight: 20 },

  inputWrap: {
    width: "100%",
    borderRadius: 12, borderWidth: 3, borderColor: colors.border,
    backgroundColor: "#0d0d06",
    overflow: "hidden",
  },
  inputWrapFocused: {
    borderColor: "#ffffff",
    shadowColor: "#fff",
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  inputWrapError: { borderColor: "#ef4444" },
  input: {
    width: "100%", color: "#fff",
    fontSize: 17, fontWeight: "700", textAlign: "center",
    paddingVertical: 16, paddingHorizontal: 20,
    letterSpacing: 1,
  },

  errorMsg: { color: "#ef4444", fontSize: 14, fontWeight: "600", backgroundColor: "rgba(239,68,68,0.1)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  loadingRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  loadingText: { color: "#aaa", fontSize: 15 },

  btn: {
    backgroundColor: colors.accent, paddingVertical: 18, paddingHorizontal: 60,
    borderRadius: 12, borderWidth: 3, borderColor: "transparent", marginTop: 4, width: "100%",
  },
  btnFocused: {
    borderColor: "#ffffff",
    backgroundColor: "#fff",
    shadowColor: "#fff",
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 16,
    transform: [{ scale: 1.05 }],
  },
  btnText: { color: "#111", fontSize: 19, fontWeight: "900", textAlign: "center" },
  btnTextFocused: { color: "#111" },

  welcomeOverlay: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  welcomeCard: {
    backgroundColor: colors.card, borderRadius: 24, padding: 52,
    alignItems: "center", gap: 20, borderWidth: 2, borderColor: colors.accent, minWidth: 340,
  },
  checkMark: { fontSize: 72, color: colors.accent },
  welcomeTitle: { color: "#fff", fontSize: 30, fontWeight: "900" },
  welcomeSub: { color: "#aaa", fontSize: 17 },
  welcomeDuration: { color: colors.accent, fontSize: 16, fontWeight: "700", marginTop: 4 },
});
