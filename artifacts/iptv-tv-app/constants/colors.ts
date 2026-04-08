export type ThemeKey = "gold" | "blue" | "red" | "purple";

const goldColors = {
  bg: "#111108", sidebar: "#0d0d06", card: "#1a1a0d", cardActive: "#252515", cardFocus: "#2e2e18",
  accent: "#f0bf1a", accentDark: "#c49a10", accentGlow: "rgba(240,191,26,0.4)",
  text: "#ffffff", subtext: "#aaaaaa", dimtext: "#666655", border: "#2a2a18", gold: "#f0bf1a", radius: 10,
  light: { background: "#111108", sidebar: "#0d0d06", card: "#1a1a0d", secondary: "#252515", foreground: "#ffffff", mutedForeground: "#aaaaaa", primary: "#f0bf1a", destructive: "#ef4444", border: "#2a2a18", muted: "#1a1a0d", focused: "#f0bf1a", focusedBorder: "#f0bf1a" },
};

export const THEMES: Record<ThemeKey, typeof goldColors> = {
  gold: goldColors,
  blue: {
    bg: "#08111a", sidebar: "#060d14", card: "#0d1a27", cardActive: "#152236", cardFocus: "#1c2e44",
    accent: "#38bdf8", accentDark: "#0ea5e9", accentGlow: "rgba(56,189,248,0.4)",
    text: "#ffffff", subtext: "#aaaaaa", dimtext: "#556677", border: "#1a2d3d", gold: "#38bdf8", radius: 10,
    light: { background: "#08111a", sidebar: "#060d14", card: "#0d1a27", secondary: "#152236", foreground: "#ffffff", mutedForeground: "#aaaaaa", primary: "#38bdf8", destructive: "#ef4444", border: "#1a2d3d", muted: "#0d1a27", focused: "#38bdf8", focusedBorder: "#38bdf8" },
  },
  red: {
    bg: "#110808", sidebar: "#0d0606", card: "#1a0d0d", cardActive: "#251515", cardFocus: "#2e1818",
    accent: "#f87171", accentDark: "#ef4444", accentGlow: "rgba(248,113,113,0.4)",
    text: "#ffffff", subtext: "#aaaaaa", dimtext: "#665555", border: "#2a1818", gold: "#f87171", radius: 10,
    light: { background: "#110808", sidebar: "#0d0606", card: "#1a0d0d", secondary: "#251515", foreground: "#ffffff", mutedForeground: "#aaaaaa", primary: "#f87171", destructive: "#ef4444", border: "#2a1818", muted: "#1a0d0d", focused: "#f87171", focusedBorder: "#f87171" },
  },
  purple: {
    bg: "#0f0811", sidebar: "#0b0610", card: "#1a0d1e", cardActive: "#251528", cardFocus: "#2e1a33",
    accent: "#c084fc", accentDark: "#a855f7", accentGlow: "rgba(192,132,252,0.4)",
    text: "#ffffff", subtext: "#aaaaaa", dimtext: "#665577", border: "#2a1833", gold: "#c084fc", radius: 10,
    light: { background: "#0f0811", sidebar: "#0b0610", card: "#1a0d1e", secondary: "#251528", foreground: "#ffffff", mutedForeground: "#aaaaaa", primary: "#c084fc", destructive: "#ef4444", border: "#2a1833", muted: "#1a0d1e", focused: "#c084fc", focusedBorder: "#c084fc" },
  },
};

export const THEME_LABELS: Record<ThemeKey, string> = {
  gold: "ذهبي ✨",
  blue: "أزرق 💎",
  red: "أحمر 🔥",
  purple: "بنفسجي 🌙",
};

export default goldColors;
