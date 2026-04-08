import React, { useState } from "react";
import { Pressable, View, Text, Image, StyleSheet } from "react-native";
import colors from "@/constants/colors";
import type { StreamItem } from "@/hooks/useApi";

interface Props {
  item: StreamItem;
  onSelect: () => void;
  hasTVPreferredFocus?: boolean;
  variant?: "poster" | "wide" | "channel";
}

export function PosterCard({ item, onSelect, hasTVPreferredFocus, variant = "poster" }: Props) {
  const [imgError, setImgError] = useState(false);

  const imageUri = item.stream_icon || item.cover;
  const isPoster  = variant === "poster";
  const isChannel = variant === "channel";
  const isWide    = variant === "wide";

  // Compact sizes tuned for 1080p TV
  const W = isPoster ? 108 : isChannel ? 132 : 168;
  const H = isPoster ? 156 : isChannel ? 74  : 94;

  return (
    <Pressable
      onPress={onSelect}
      focusable={true}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={({ focused }) => [
        styles.wrap,
        { width: W },
        (focused as boolean) && styles.wrapFocused,
      ]}
    >
      {({ focused }: { focused: boolean }) => (
        <View style={[styles.thumb, { width: W, height: H }, (focused as boolean) && styles.thumbFocused]}>

          {/* Image */}
          {imageUri && !imgError ? (
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFill}
              resizeMode={isChannel ? "contain" : "cover"}
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
              <Text style={styles.placeholderIcon}>
                {isChannel ? "📡" : isPoster ? "🎬" : "▶"}
              </Text>
            </View>
          )}

          {/* Rating badge */}
          {item.rating && Number(item.rating) > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>★{Number(item.rating).toFixed(1)}</Text>
            </View>
          ) : null}

          {/* Title overlay — always visible at bottom */}
          <View style={styles.titleOverlay}>
            <Text style={styles.titleText} numberOfLines={isChannel ? 1 : 2}>
              {item.name}
            </Text>
          </View>

          {/* Focus: white border glow + play button */}
          {focused && (
            <>
              <View style={styles.focusSheen} />
              <View style={styles.playCircle}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 5,
    marginVertical: 5,
  },
  wrapFocused: {
    transform: [{ scale: 1.11 }],
    zIndex: 20,
  },
  thumb: {
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbFocused: {
    borderColor: "#ffffff",
    shadowColor: "#ffffff",
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 18,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17181f",
  },
  placeholderIcon: { fontSize: 22, color: "#555" },

  badge: {
    position: "absolute",
    top: 3,
    left: 3,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  badgeText: { color: colors.gold, fontSize: 9, fontWeight: "700" },

  // Title overlay at the bottom of the card
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 5,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  titleText: {
    color: "#ddd",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "right",
    lineHeight: 12,
  },

  // Focus overlay
  focusSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  playCircle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -18,
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { color: "#111", fontSize: 14, fontWeight: "900" },
});
