import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { API_BASE } from "@/hooks/useApi";
import { getDeviceId } from "@/hooks/storage";

interface SubInfo {
  code: string;
  label: string;
  expires_at: string | null;
  is_lifetime: boolean;
  days_left: number | null;
}

export default function MySubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    loadSubInfo();
    getDeviceId().then(setDeviceId);
  }, []);

  async function loadSubInfo() {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem("subscription");
      if (!raw) { router.replace("/subscription"); return; }
      const saved = JSON.parse(raw);

      const r = await fetch(`${API_BASE}/api/subscriptions/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: saved.code }),
      });
      const j = await r.json();
      if (j.valid) {
        setSub({ code: saved.code, label: j.label, expires_at: j.expires_at, is_lifetime: j.is_lifetime, days_left: j.days_left });
      } else {
        setSub(saved);
      }
    } catch {
      const raw = await AsyncStorage.getItem("subscription");
      if (raw) setSub(JSON.parse(raw));
    }
    setLoading(false);
  }

  function formatDate(dt: string | null) {
    if (!dt) return "—";
    const d = new Date(dt);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  async function logout() {
    await AsyncStorage.removeItem("subscription");
    router.replace("/subscription");
  }

  const daysLeft = sub?.days_left;
  const warningColor = daysLeft !== null && daysLeft !== undefined && daysLeft <= 7 ? "#ef4444" : daysLeft !== null && daysLeft !== undefined && daysLeft <= 30 ? "#f59e0b" : "#22c55e";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hasTVPreferredFocus
          style={({ focused }) => [styles.backBtn, (focused as boolean) && styles.backBtnFocused]}
        >
          <Text style={styles.backBtnText}>← رجوع</Text>
        </Pressable>
        <Text style={styles.headerTitle}>اشتراكي</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : !sub ? (
          <Text style={styles.noSub}>لا يوجد اشتراك فعّال</Text>
        ) : (
          <>
            <View style={styles.logoWrap}>
              <Text style={styles.logoText}>ANGEL</Text>
              <Text style={styles.logoPro}> TV pro</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: sub.is_lifetime ? "#22c55e" : warningColor }]} />
                <Text style={[styles.statusText, { color: sub.is_lifetime ? "#22c55e" : warningColor }]}>
                  {sub.is_lifetime ? "اشتراك نشط" : daysLeft !== null && daysLeft !== undefined && daysLeft <= 0 ? "منتهي" : "اشتراك نشط"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>نوع الاشتراك</Text>
                <Text style={styles.infoValue}>{sub.label}</Text>
              </View>

              <View style={styles.divider} />

              {sub.is_lifetime ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>المدة</Text>
                  <Text style={[styles.infoValue, { color: "#22c55e" }]}>مدى الحياة ♾</Text>
                </View>
              ) : (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>ينتهي في</Text>
                    <Text style={styles.infoValue}>{formatDate(sub.expires_at)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>الأيام المتبقية</Text>
                    <Text style={[styles.infoValue, { color: warningColor, fontWeight: "900" }]}>
                      {daysLeft !== null && daysLeft !== undefined ? `${daysLeft} يوم` : "—"}
                    </Text>
                  </View>
                  {daysLeft !== null && daysLeft !== undefined && daysLeft <= 7 && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>⚠ اشتراكك على وشك الانتهاء! تواصل مع المشرف لتجديده.</Text>
                    </View>
                  )}
                </>
              )}

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>كود الاشتراك</Text>
                <Text style={[styles.infoValue, { fontFamily: "monospace", fontSize: 13, color: colors.accent }]}>{sub.code}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>معرّف الجهاز</Text>
                <Text style={[styles.infoValue, { fontSize: 11, color: "#666" }]} numberOfLines={1}>{deviceId.substring(0, 20)}...</Text>
              </View>
            </View>

            <Pressable
              onPress={logout}
              style={({ focused }) => [styles.logoutBtn, (focused as boolean) && styles.logoutBtnFocused]}
            >
              <Text style={styles.logoutText}>تسجيل الخروج</Text>
            </Pressable>
          </>
        )}
      </View>
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
    paddingVertical: 9, borderRadius: 8, borderWidth: 2, borderColor: "transparent",
  },
  backBtnFocused: { borderColor: colors.accent },
  backBtnText: { color: "#fff", fontSize: 15 },
  headerTitle: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "center" },

  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24, paddingHorizontal: 40 },

  logoWrap: { flexDirection: "row", alignItems: "flex-end" },
  logoText: { fontSize: 36, fontWeight: "900", color: "#fff", letterSpacing: 2 },
  logoPro: { fontSize: 16, fontWeight: "700", color: colors.accent, marginBottom: 4 },

  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 32,
    width: "100%", maxWidth: 500, borderWidth: 1, borderColor: colors.border, gap: 16,
  },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 16, fontWeight: "700" },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { color: "#888", fontSize: 14 },
  infoValue: { color: "#fff", fontSize: 15, fontWeight: "700", textAlign: "left" },

  warningBox: {
    backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
  },
  warningText: { color: "#fca5a5", fontSize: 13, textAlign: "center" },

  noSub: { color: "#888", fontSize: 18 },

  logoutBtn: {
    backgroundColor: "rgba(239,68,68,0.12)", paddingHorizontal: 40, paddingVertical: 14,
    borderRadius: 10, borderWidth: 2, borderColor: "rgba(239,68,68,0.3)",
  },
  logoutBtnFocused: { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.25)" },
  logoutText: { color: "#ef4444", fontSize: 16, fontWeight: "700" },
});
