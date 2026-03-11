import { REFETCH_LOGO_EVENT } from "@/LogoContext";
import { useState, useEffect } from "react";
import { API_BASE } from "@/utils/constants";

const availableThemes = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * Determines the current theme of the application.
 * "system" follows the OS preference, "light" and "dark" force that mode.
 * @returns {{theme: ('system' | 'light' | 'dark'), setTheme: function, availableThemes: object}}
 */
export function useTheme() {
  const [theme, _setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "default") return "dark"; // migrate legacy value
    return stored || "system";
  });

  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark"
  );

  // Listen for OS level theme changes
  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => setSystemTheme(e.matches ? "light" : "dark");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  // Fetch and apply custom theme colors
  useEffect(() => {
    async function fetchCustomColors() {
      try {
        const cached = localStorage.getItem("custom_theme_colors");
        const { colors: cachedColors, lastFetched } = cached
          ? JSON.parse(cached)
          : { colors: null, lastFetched: 0 };

        if (cachedColors && Date.now() - lastFetched < 3_600_000) {
          applyCustomColors(cachedColors, resolvedTheme);
          return;
        }

        const response = await fetch(`${API_BASE}/system/theme-colors`);
        const { colors } = await response.json();

        if (colors) {
          localStorage.setItem(
            "custom_theme_colors",
            JSON.stringify({ colors, lastFetched: Date.now() })
          );
          applyCustomColors(colors, resolvedTheme);
        }
      } catch (error) {
        console.error("Error fetching custom theme colors:", error);
      }
    }

    fetchCustomColors();
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.body.classList.toggle("light", resolvedTheme === "light");
    localStorage.setItem("theme", theme);
    window.dispatchEvent(new Event(REFETCH_LOGO_EVENT));
  }, [resolvedTheme, theme]);

  // In development, attach keybind combinations to toggle theme
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    function toggleOnKeybind(e) {
      if (e.metaKey && e.key === ".") {
        e.preventDefault();
        _setTheme((prev) => (prev === "light" ? "dark" : "light"));
      }
    }
    document.addEventListener("keydown", toggleOnKeybind);
    return () => document.removeEventListener("keydown", toggleOnKeybind);
  }, []);

  /**
   * Sets the theme of the application and runs any
   * other necessary side effects
   * @param {string} newTheme The new theme to set
   */
  function setTheme(newTheme) {
    _setTheme(newTheme);
  }

  return { theme, setTheme, availableThemes };
}

/**
 * Applies custom theme colors to CSS variables
 * @param {object} colors - Custom colors object with dark and light themes
 * @param {string} resolvedTheme - The current resolved theme (light or dark)
 */
function applyCustomColors(colors, resolvedTheme) {
  if (!colors || !colors[resolvedTheme]) return;

  const root = document.documentElement;
  const themeColors = colors[resolvedTheme];

  Object.entries(themeColors).forEach(([variable, value]) => {
    if (variable.startsWith("--theme-")) {
      root.style.setProperty(variable, value);
    }
  });
}
