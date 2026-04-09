import { Platform } from "react-native";

export const TV_FOCUS = {
  borderWidth: 3,
  borderColor: "#ffffff",
  shadowColor: "#ffffff",
  shadowOpacity: 0.7,
  shadowRadius: 16,
  elevation: 18,
  transform: [{ scale: 1.07 as number }],
} as const;

export const TV_FOCUS_GLOW = (accentColor: string) => ({
  borderWidth: 3,
  borderColor: "#ffffff",
  shadowColor: accentColor,
  shadowOpacity: 1,
  shadowRadius: 20,
  elevation: 20,
  transform: [{ scale: 1.06 as number }],
});

export const TV_FOCUS_SUBTLE = {
  borderWidth: 3,
  borderColor: "#ffffff",
  shadowColor: "#ffffff",
  shadowOpacity: 0.5,
  shadowRadius: 10,
  elevation: 10,
} as const;

export const isTV = Platform.isTV;
