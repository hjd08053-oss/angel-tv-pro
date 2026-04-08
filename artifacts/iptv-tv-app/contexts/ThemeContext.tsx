import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { THEMES, type ThemeKey } from "@/constants/colors";

const THEME_KEY = "app_theme";

interface ThemeContextType {
  themeKey: ThemeKey;
  colors: typeof THEMES.gold;
  setTheme: (t: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeKey: "gold",
  colors: THEMES.gold,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>("gold");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(v => {
      if (v && v in THEMES) setThemeKey(v as ThemeKey);
    });
  }, []);

  function setTheme(t: ThemeKey) {
    setThemeKey(t);
    AsyncStorage.setItem(THEME_KEY, t);
  }

  return (
    <ThemeContext.Provider value={{ themeKey, colors: THEMES[themeKey], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
