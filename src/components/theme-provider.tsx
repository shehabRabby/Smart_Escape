"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { parseThemePreference, resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";
import type { ThemePreference } from "@/lib/theme";
import { useLanguage } from "./language-provider";

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolveTheme(preference, matchMedia("(prefers-color-scheme: dark)").matches);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const preferenceRef = useRef<ThemePreference>("system");
  useEffect(() => {
    const saved = parseThemePreference(document.documentElement.dataset.themePreference);
    preferenceRef.current = saved;
    setPreferenceState(saved);
    applyTheme(saved);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => { if (preferenceRef.current === "system") applyTheme("system"); };
    const onStorageChange = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      const next = parseThemePreference(event.newValue);
      preferenceRef.current = next;
      setPreferenceState(next);
      applyTheme(next);
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorageChange);
    return () => { media.removeEventListener("change", onSystemChange); window.removeEventListener("storage", onStorageChange); };
  }, []);

  function setPreference(next: ThemePreference) {
    preferenceRef.current = next;
    applyTheme(next);
    setPreferenceState(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Theme still works when browser storage is unavailable. */ }
  }

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function ThemeSwitcher() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is required.");
  const { t } = useLanguage();
  const options = [{ value: "light", icon: Sun }, { value: "dark", icon: Moon }, { value: "system", icon: Monitor }] as const;
  return <div className="theme-switcher" role="group" aria-label={t("theme")}>
    {options.map(option => <button type="button" key={option.value} data-theme-choice={option.value}
      aria-label={t(option.value)} title={t(option.value)} aria-pressed={context.preference === option.value}
      onClick={() => context.setPreference(option.value)}><option.icon size={17} aria-hidden="true" /></button>)}
  </div>;
}
