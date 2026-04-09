import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import colors from "@/constants/colors";
import { API_BASE } from "@/hooks/useApi";
import { getDeviceId } from "@/hooks/storage";

type Stage = "enter" | "loading" | "welcome" | "error";
type LoginMode = "code" | "account";

type FocusKey = "mode-code" | "mode-account" | "code" | "username" | "password" | "submit";

function TvField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  focused,
  hasTVPreferredFocus,
  onFocus,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  focused: boolean;
  hasTVPreferredFocus?: boolean;
  onFocus: () => void;
  editable?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      focusable
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={() => {
        onFocus();
        setTimeout(() => inputRef.current?.focus(), 80);
      }}
      style={({ focused: pressFocused }) => [
        styles.fieldShell,
        (focused || pressFocused) && styles.fieldShellFocused,
      ]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6f6f6f"
        secureTextEntry={secureTextEntry}
        editable={editable}
        style={styles.fieldInput}
        autoCapitalize={secureTextEntry ? "none" : "characters"}
      />
    </Pressable>
  );
}

export default function SubscriptionTvScreen() {
  const [mode, setMode] = useState<LoginMode>("code");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<Stage>("enter");
  const [errMsg, setErrMsg] = useState("");
  const [subInfo, setSubInfo] = useState<{ label: string; expires_at: string | null; is_lifetime: boolean } | null>(null);
  const [focusedKey, setFocusedKey] = useState<FocusKey>("submit");

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setFocusedKey(mode === "code" ? "code" : "username");
  }, [mode]);

  useEffect(() => {
    if (stage === "welcome") {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 8,
          stiffness: 100,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.spring(checkAnim, {
        toValue: 1,
        useNativeDriver: true,
        delay: 200,
        damping: 6,
      }).start();
      const t = setTimeout(() => router.replace("/(home)"), 4000);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const submitText = useMemo(() => (mode === "code" ? "تحقق من الكود" : "دخول"), [mode]);

  async function saveAndSuccess(j: any, codeValue: string) {
    await AsyncStorage.setItem(
      "subscription",
      JSON.stringify({
        code: codeValue,
        expires_at: j.expires_at,
        label: j.label,
        is_lifetime: j.is_lifetime,
        days_left: j.days_left,
      })
    );
    setSubInfo({ label: j.label, expires_at: j.expires_at, is_lifetime: j.is_lifetime });
    setStage("welcome");
  }

  async function verifyByCode() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setErrMsg("أدخل كود الاشتراك");
      setStage("error");
      return;
    }
    setStage("loading");
    try {
      const deviceId = await getDeviceId();
      const r = await fetch(`${API_BASE}/api/subscriptions/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmed,
          device_id: deviceId,
          device_name: `TV-${Platform.OS}`,
        }),
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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {stage === "welcome" && (
        <View style={styles.welcomeOverlay}>
          <Animated.View style={[styles.welcomeCard, { transform: [{ scale: scaleAnim }] }]}>
            <Animated.Text style={[styles.checkMark, { transform: [{ scale: checkAnim }] }]}>✓</Animated.Text>
            <Animated.View style={{ opacity: fadeAnim, alignItems: "center", gap: 10 }}>
              <Text style={styles.welcomeTitle}>تم الاشتراك بنجاح</Text>
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
          <Text style={styles.appSubtitle}>شاشة اشتراك مصممة للريموت</Text>

          <View style={styles.card}>
            <View style={styles.modeTabs}>
              <Pressable
                focusable
                hasTVPreferredFocus={mode === "code"}
                onFocus={() => setFocusedKey("mode-code")}
                onPress={() => {
                  setMode("code");
                  setStage("enter");
                }}
                style={({ focused }) => [
                  styles.modeTab,
                  mode === "code" && styles.modeTabActive,
                  (focused || focusedKey === "mode-code") && styles.modeTabFocusedStrong,
                ]}
              >
                <Text style={[styles.modeTabText, mode === "code" && styles.modeTabTextActive]}>بالكود</Text>
              </Pressable>

              <Pressable
                focusable
                hasTVPreferredFocus={mode === "account"}
                onFocus={() => setFocusedKey("mode-account")}
                onPress={() => {
                  setMode("account");
                  setStage("enter");
                }}
                style={({ focused }) => [
                  styles.modeTab,
                  mode === "account" && styles.modeTabActive,
                  (focused || focusedKey === "mode-account") && styles.modeTabFocusedStrong,
                ]}
              >
                <Text style={[styles.modeTabText, mode === "account" && styles.modeTabTextActive]}>بالحساب</Text>
              </Pressable>
            </View>

            {mode === "code" ? (
              <>
                <Text style={styles.cardTitle}>أدخل كود الاشتراك</Text>
                <Text style={styles.cardSub}>استخدم الريموت للتنقل ثم اضغط موافق على الحقل للإدخال</Text>
                <TvField
                  label="كود الاشتراك"
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.toUpperCase());
                    if (stage === "error") setStage("enter");
                  }}
                  placeholder="ANGEL-XXXX-XXXX"
                  focused={focusedKey === "code"}
                  hasTVPreferredFocus
                  onFocus={() => setFocusedKey("code")}
                  editable={stage !== "loading"}
                />
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>تسجيل الدخول بالحساب</Text>
                <Text style={styles.cardSub}>كل حقل يظهر بإطار واضح عند الوقوف عليه بالريموت</Text>
                <TvField
                  label="اسم المستخدم"
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    if (stage === "error") setStage("enter");
                  }}
                  placeholder="اسم المستخدم"
                  focused={focusedKey === "username"}
                  hasTVPreferredFocus
                  onFocus={() => setFocusedKey("username")}
                  editable={stage !== "loading"}
                />
                <TvField
                  label="كلمة المرور"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (stage === "error") setStage("enter");
                  }}
                  placeholder="كلمة المرور"
                  secureTextEntry
                  focused={focusedKey === "password"}
                  onFocus={() => setFocusedKey("password")}
                  editable={stage !== "loading"}
                />
              </>
            )}

            {stage === "error" && <Text style={styles.errorMsg}>{errMsg}</Text>}

            {stage === "loading" ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.loadingText}>جاري التحقق...</Text>
              </View>
            ) : (
              <Pressable
                focusable
                onFocus={() => setFocusedKey("submit")}
                onPress={submit}
                style={({ focused }) => [
                  styles.btn,
                  (focused || focusedKey === "submit") && styles.btnFocusedStrong,
                ]}
              >
                <Text style={styles.btnText}>{submitText}</Text>
              </Pressable>
            )}

            <Text style={styles.hint}>لازم تشوف إطار واضح وتكبير على العنصر المحدد أثناء التنقل بالريموت.</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 40,
  },
  logoWrap: { flexDirection: "row", alignItems: "flex-end" },
  logoText: { fontSize: 48, fontWeight: "900", color: "#fff", letterSpacing: 2 },
  logoPro: { fontSize: 22, fontWeight: "700", color: colors.accent, marginBottom: 6 },
  appSubtitle: { color: "#8f8f8f", fontSize: 16, marginTop: -12 },
  card: {
    backgroundColor: "#5f6747",
    borderRadius: 24,
    padding: 36,
    alignItems: "center",
    gap: 16,
    width: "100%",
    maxWidth: 620,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
  },
  modeTabs: { flexDirection: "row", gap: 12, marginBottom: 8 },
  modeTab: {
    minWidth: 150,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "transparent",
    backgroundColor: "#282d21",
    alignItems: "center",
  },
  modeTabActive: { backgroundColor: "#f6ddca" },
  modeTabFocusedStrong: {
    borderColor: "#ffffff",
    transform: [{ scale: 1.08 }],
    shadowColor: "#ffffff",
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 16,
  },
  modeTabText: { color: "#ececec", fontSize: 24, fontWeight: "800" },
  modeTabTextActive: { color: "#3a312e" },
  cardTitle: { color: "#fff", fontSize: 34, fontWeight: "900", textAlign: "center" },
  cardSub: { color: "#edf1e6", fontSize: 18, textAlign: "center", lineHeight: 28 },
  fieldShell: {
    width: "100%",
    backgroundColor: "#23211d",
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  fieldShellFocused: {
    borderColor: "#ffffff",
    transform: [{ scale: 1.03 }],
    shadowColor: "#ffffff",
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 18,
    backgroundColor: "#2d2a25",
  },
  fieldLabel: { color: "#f4e5d8", fontSize: 18, fontWeight: "800", textAlign: "center" },
  fieldInput: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
    paddingVertical: 8,
  },
  errorMsg: { color: "#ffd1d1", fontSize: 18, fontWeight: "700", textAlign: "center" },
  loadingRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  loadingText: { color: "#fff", fontSize: 18 },
  btn: {
    backgroundColor: "#f6ddca",
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "transparent",
    width: "100%",
  },
  btnFocusedStrong: {
    borderColor: "#ffffff",
    transform: [{ scale: 1.04 }],
    shadowColor: "#ffffff",
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 20,
  },
  btnText: { color: "#40352f", fontSize: 28, fontWeight: "900", textAlign: "center" },
  hint: { color: "#f4f4f4", fontSize: 14, textAlign: "center", opacity: 0.9 },
  welcomeOverlay: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  welcomeCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    gap: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    minWidth: 320,
  },
  checkMark: { fontSize: 64, color: colors.accent },
  welcomeTitle: { color: "#fff", fontSize: 28, fontWeight: "900" },
  welcomeSub: { color: "#aaa", fontSize: 16 },
  welcomeDuration: { color: colors.accent, fontSize: 15, fontWeight: "700", marginTop: 4 },
});