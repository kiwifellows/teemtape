import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "teemtape-theme";

export type Theme = "light" | "dark";

function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* private mode */
  }
  return "dark";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const themeLabel = theme === "light" ? "🌙 Dark" : "☀️ Light";

  return { theme, toggleTheme, themeLabel };
}
