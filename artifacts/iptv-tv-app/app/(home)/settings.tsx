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
          style={({ focused }) => [styles.backBtn, { borderColor: (focused as boolean) ? colors.accent : "transparent" }]}
        >
          <Text style={styles.backBtnText}>← رجوع</Text>
        </Pressable>
        <Text style={styles.headerTitle}>الإعدادات</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 32, gap: 32 }}>
        {/* Theme */}
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
                    { backgroundColor: t.card, borderColor: active ? t.accent : (focused as boolean) ? t.accent : colors.border },
                    active && { shadowColor: t.accentGlow, shadowOpacity: 1, shadowRadius: 16 },
                  ]}
                >
                  <View style={[styles.themeCircle, { backgroundColor: t.accent }]} />
                  <Text style={[styles.themeLabel, { color: active ? t.accent : "#ccc" }]}>{THEME_LABELS[key]}</Text>
                  {active && <Text style={[styles.themeActive, { color: t.accent }]}>✓ مفعّل</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Preview */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>👁 معاينة الثيم</Text>
          <View style={[styles.previewBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.previewTitle, { color: "#fff" }]}>ANGEL <Text style={{ color: colors.accent }}>TV pro</Text></Text>
            <View style={[styles.previewBtn, { backgroundColor: colors.accent }]}>
              <Text style={styles.previewBtnText}>▶ شغّل الآن</Text>
            </View>
            <Text style={[styles.previewSub, { color: colors.subtext }]}>هذا مثال على مظهر التطبيق</Text>
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
    backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 16,
    paddingVertical: 9, borderRadius: 8, borderWidth: 2,
  },
  backBtnText: { color: "#fff", fontSize: 15 },
  headerTitle: { flex: 1, color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "right" },
  section: {
    borderRadius: 14, padding: 24,
    borderWidth: 1, gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  sectionDesc: { fontSize: 14 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  themeCard: {
    flex: 1, minWidth: 140, borderRadius: 12,
    padding: 18, borderWidth: 2,
    alignItems: "center", gap: 8,
  },
  themeCircle: { width: 36, height: 36, borderRadius: 18 },
  themeLabel: { fontSize: 15, fontWeight: "700" },
  themeActive: { fontSize: 12, fontWeight: "700" },
  previewBox: { borderRadius: 10, padding: 20, borderWidth: 1, alignItems: "center", gap: 12 },
  previewTitle: { fontSize: 24, fontWeight: "900" },
  previewBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  previewBtnText: { color: "#111", fontSize: 16, fontWeight: "800" },
  previewSub: { fontSize: 13 },
});
