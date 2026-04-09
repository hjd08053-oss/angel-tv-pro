import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { THEMES, THEME_LABELS, type ThemeKey } from "@/constants/colors";

const THEME_KEYS: ThemeKey[] = ["gold", "blue", "red", "purple"];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { themeKey, colors, setTheme } = useTheme();

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, { paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.sidebar, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          hasTVPreferredFocus
          style={({ focused }) => [
            styles.backBtn,
            { borderColor: focused ? "#ffffff" : "transparent" },
            focused && styles.backBtnFocused,
          ]}
        >
          <Text style={styles.backBtnText}>← رجوع</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>الإعدادات</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 32, gap: 32 }}>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>🎨 ثيم الألوان</Text>
          <Text style={[styles.sectionDesc, { color: colors.subtext }]}>اختر لون واجهة التطبيق</Text>
          <View style={styles.themeGrid}>
            {THEME_KEYS.map(key => {
              const t = THEMES[key];
              const active = themeKey === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTheme(key)}
                  style={({ focused }) => [
                    styles.themeCard,
                    { backgroundColor: t.card, borderColor: active ? t.accent : focused ? "#ffffff" : colors.border },
                    active && { shadowColor: t.accentGlow, shadowOpacity: 1, shadowRadius: 16 },
                    focused && styles.themeCardFocused,
                  ]}
                >
                  {({ focused }) => (
                    <>
                      <View style={[
                        styles.themeCircle,
                        { backgroundColor: t.accent },
                        focused && { width: 46, height: 46, borderRadius: 23, shadowColor: t.accent, shadowOpacity: 0.8, shadowRadius: 12 },
                      ]} />
                      <Text style={[styles.themeLabel, { color: active || focused ? t.accent : "#ccc" }]}>
                        {THEME_LABELS[key]}
                      </Text>
                      {active && <Text style={[styles.themeActive, { color: t.accent }]}>✓ مفعّل</Text>}
                      {focused && !active && <Text style={[styles.themeActive, { color: t.accent }]}>← اضغط</Text>}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>👁 معاينة الثيم</Text>
          <View style={[styles.previewBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.previewTitle, { color: "#fff" }]}>
              ANGEL <Text style={{ color: colors.accent }}>TV pro</Text>
            </Text>
            <View style={[styles.previewBtn, { backgroundColor: colors.accent }]}>
              <Text style={styles.previewBtnText}>▶ شغّل الآن</Text>
            </View>
            <Text style={[styles.previewSub, { color: colors.subtext }]}>هذا مثال على مظهر التطبيق</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>ℹ️ معلومات</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>الإصدار</Text>
            <Text style={[styles.infoValue, { color: "#fff" }]}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>المنصة</Text>
            <Text style={[styles.infoValue, { color: "#fff" }]}>Android TV</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, gap: 16,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 20,
    paddingVertical: 11, borderRadius: 8, borderWidth: 3,
  },
  backBtnFocused: {
    backgroundColor: "rgba(255,255,255,0.18)",
    shadowColor: "#fff",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    transform: [{ scale: 1.06 }],
  },
  backBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: "800", textAlign: "right" },
  section: {
    borderRadius: 14, padding: 24,
    borderWidth: 1, gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  sectionDesc: { fontSize: 14 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 },
  themeCard: {
    flex: 1, minWidth: 150, borderRadius: 14,
    padding: 20, borderWidth: 3,
    alignItems: "center", gap: 10,
  },
  themeCardFocused: {
    shadowColor: "#ffffff",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
    transform: [{ scale: 1.06 }],
  },
  themeCircle: { width: 40, height: 40, borderRadius: 20 },
  themeLabel: { fontSize: 16, fontWeight: "700" },
  themeActive: { fontSize: 12, fontWeight: "700" },
  previewBox: { borderRadius: 10, padding: 24, borderWidth: 1, alignItems: "center", gap: 14 },
  previewTitle: { fontSize: 24, fontWeight: "900" },
  previewBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  previewBtnText: { color: "#111", fontSize: 16, fontWeight: "800" },
  previewSub: { fontSize: 13 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "700" },
});
