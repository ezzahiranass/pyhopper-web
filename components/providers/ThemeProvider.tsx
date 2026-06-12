"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_THEME_ID,
  getThemeDefinition,
  isThemeId,
  themeOptions,
  THEME_STORAGE_KEY,
  type ThemeDefinition,
  type ThemeId,
} from "@/lib/theme/themes";

type ThemeContextValue = {
  currentTheme: ThemeDefinition;
  setTheme: (themeId: ThemeId) => void;
  theme: ThemeId;
  themeOptions: ThemeDefinition[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): ThemeId {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_ID;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme && isThemeId(storedTheme)) {
      return storedTheme;
    }
  } catch {
    // ignore storage failures and keep default theme
  }

  return DEFAULT_THEME_ID;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(getInitialTheme);

  useEffect(() => {
    const themeDefinition = getThemeDefinition(theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = themeDefinition.mode === "dark" ? "dark" : "light";

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage failures
    }
  }, [theme]);

  const setTheme = useCallback((themeId: ThemeId) => {
    setThemeState(themeId);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      currentTheme: getThemeDefinition(theme),
      setTheme,
      theme,
      themeOptions,
    }),
    [setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
}