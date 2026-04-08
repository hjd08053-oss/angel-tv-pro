import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect, useState, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, ActivityIndicator, Animated, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { API_BASE } from "@/hooks/useApi";
import colors from "@/constants/colors";
import { ThemeProvider } from "@/contexts/ThemeContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

type SubStatus = "checking" | "ok" | "need_sub" | "expired";

async function getSubscriptionStatus(): Promise<SubStatus> {
  try {
    const raw = await AsyncStorage.getItem("subscription");
    if (!raw) return "need_sub";
    const sub = JSON.parse(raw);
    if (sub.is_lifetime) return "ok";
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      await AsyncStorage.removeItem("subscription");
      return "expired";
    }
    try {
      const r = await fetch(`${API_BASE}/api/subscriptions/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sub.code }),
      });
      const j = await r.json();
      if (!j.valid) {
        await AsyncStorage.removeItem("subscription");
        return j.expired ? "expired" : "need_sub";
      }
    } catch {}
    return "ok";
  } catch {
    return "need_sub";
  }
}

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.2)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const welcomeAnim = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const [welcomeMsg, setWelcomeMsg] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("app_opened_before").then(v => {
      setWelcomeMsg(v ? "أهلاً بك مجدداً 👋" : "أهلاً بك في ANGEL TV pro");
      AsyncStorage.setItem("app_opened_before", "1");
    });

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(welcomeAnim, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        ]),
        { iterations: 2 }
      ),
      Animated.timing(exitAnim, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.splash, { opacity: exitAnim }]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim, alignItems: "center", gap: 10 }}>
        <Animated.Text style={[styles.splashTitle, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}>
          ANGEL
        </Animated.Text>
        <Text style={styles.splashSub}>TV pro</Text>
        <View style={styles.splashLine} />
        <Animated.Text style={[styles.splashWelcome, { opacity: welcomeAnim }]}>
          {welcomeMsg}
        </Animated.Text>
        <Text style={styles.splashTag}>بث لا حدود له</Text>
      </Animated.View>
    </Animated.View>
  );
}

async function applyOtaUpdate() {
  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (_) {}
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  const [subStatus, setSubStatus] = useState<SubStatus>("checking");
  const [splashDone, setSplashDone] = useState(false);
  const navigationState = useRootNavigationState();
  const navReady = !!navigationState?.key;

  useEffect(() => {
    if (!__DEV__) applyOtaUpdate();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      getSubscriptionStatus().then(setSubStatus);
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!navReady || !splashDone) return;
    if (subStatus === "need_sub") router.replace("/subscription");
    if (subStatus === "expired") router.replace("/expired");
  }, [navReady, subStatus, splashDone]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                <Stack.Screen name="(home)" />
                <Stack.Screen name="subscription" />
                <Stack.Screen name="expired" />
              </Stack>

              {!splashDone && <SplashOverlay onDone={() => setSplashDone(true)} />}

              {splashDone && subStatus === "checking" && (
                <View style={styles.checkOverlay}>
                  <Text style={styles.checkTitle}>
                    ANGEL <Text style={{ color: colors.accent }}>TV pro</Text>
                  </Text>
                  <ActivityIndicator color={colors.accent} size="large" />
                </View>
              )}
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  splashTitle: {
    fontSize: 72,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 8,
  },
  splashSub: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 4,
    marginTop: -8,
  },
  splashLine: {
    width: 120,
    height: 2,
    backgroundColor: colors.accent,
    marginVertical: 8,
    borderRadius: 1,
  },
  splashWelcome: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 1,
    textShadowColor: colors.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  splashTag: {
    fontSize: 13,
    color: colors.subtext,
    letterSpacing: 2,
  },
  checkOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bg,
    alignItems: "center", justifyContent: "center", gap: 20,
    zIndex: 100,
  },
  checkTitle: { fontSize: 36, fontWeight: "900", color: "#fff", letterSpacing: 2 },
});
