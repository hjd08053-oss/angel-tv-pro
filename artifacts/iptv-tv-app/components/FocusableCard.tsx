import React, { useState } from "react";
import { Pressable, View, Text, Image, StyleSheet, Platform } from "react-native";
import colors from "@/constants/colors";
import type { StreamItem } from "@/hooks/useApi";

interface Props {
  item: StreamItem;
  onSelect: () => void;
  hasTVPreferredFocus?: boolean;
  width?: number;
}

export function FocusableCard({ item, onSelect, hasTVPreferredFocus, width = 160 }: Props) {
  const [focused, setFocused] = useState(false);

  const imageUri = item.stream_icon || item.cover;

  return (
    <Pressable
      onPress={onSelect}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[
        styles.card,
        { width },
        focused && styles.focused,
      ]}
    >
      <View style={[styles.thumb, { width, height: width * 0.56 }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
            <Text style={styles.placeholderIcon}>▶</Text>
          </View>
        )}
        {focused && <View style={styles.focusOverlay} />}
      </View>
      <Text style={[styles.name, focused && styles.nameFocused]} numberOfLines={2}>
        {item.name}
      </Text>
      {item.rating ? (
        <Text style={styles.rating}>★ {Number(item.rating).toFixed(1)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 8,
    borderRadius: colors.radius,
    overflow: "hidden",
    backgroundColor: colors.light.card,
    borderWidth: 2,
    borderColor: "transparent",
  },
  focused: {
    borderColor: colors.light.focusedBorder,
    transform: [{ scale: 1.06 }],
    shadowColor: colors.light.focused,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  thumb: {
    backgroundColor: colors.light.muted,
    overflow: "hidden",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.secondary,
  },
  placeholderIcon: {
    fontSize: 28,
    color: colors.light.mutedForeground,
  },
  focusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(124,58,237,0.15)",
  },
  name: {
    color: colors.light.foreground,
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  nameFocused: {
    color: colors.light.focusedBorder,
  },
  rating: {
    color: "#fbbf24",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
});
