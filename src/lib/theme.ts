export type ThemePreference = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "smart-escape-theme";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
  return preference === "system" ? systemDark ? "dark" : "light" : preference;
}

// Runs before the first paint. Only this fixed, trusted string is inserted into HTML.
export const THEME_INIT_SCRIPT = `(() => {
  let preference = 'system';
  try { const saved = localStorage.getItem('${THEME_STORAGE_KEY}'); if (saved === 'light' || saved === 'dark') preference = saved; } catch {}
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = preference === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference;
})();`;
