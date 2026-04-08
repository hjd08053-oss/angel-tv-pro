import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors from "@/constants/colors";

export default function ExpiredScreen() {
  async function logout() {
    await AsyncStorage.removeItem("subscription");
    router.replace("/subscription");
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.icon}>⏰</Text>
        <Text style={styles.title}>انتهى اشتراكك</Text>
        <Text style={styles.sub}>
          تواصل مع مالك السيرفر لتجديد اشتراكك والاستمرار في المشاهدة
        </Text>

        <Pressable
          onPress={logout}
          hasTVPreferredFocus
          style={({ focused }) => [styles.btn, (focused as boolean) && styles.btnFocused]}
        >
          <Text style={styles.btnText}>إدخال كود جديد</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    gap: 18,
    maxWidth: 440,
    borderWidth: 2,
    borderColor: "#ef4444",
  },
  icon: { fontSize: 60 },
  title: { color: "#fff", fontSize: 28, fontWeight: "900" },
  sub: { color: "#aaa", fontSize: 15, textAlign: "center", lineHeight: 24 },
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  btnFocused: { borderColor: "#fff", shadowColor: colors.accentGlow, shadowOpacity: 1, shadowRadius: 14 },
  btnText: { color: "#111", fontSize: 18, fontWeight: "900" },
});
