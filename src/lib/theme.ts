/**
 * The six themes from the design (docs/design/README.md). The colours live
 * in `globals.css` as `[data-theme="…"]` variable sets; this file only knows
 * their names and the cookie that remembers the choice on this browser.
 */

export const themes = [
  "violet",
  "indigo",
  "blue",
  "green",
  "red",
  "dark",
] as const;
export type Theme = (typeof themes)[number];

export const defaultTheme: Theme = "violet";

/** Not secret: the server reads it to render `<html data-theme>`. */
export const THEME_COOKIE = "gm_theme";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: unknown): value is Theme {
  return (
    typeof value === "string" && (themes as readonly string[]).includes(value)
  );
}

export function resolveTheme(value: string | null | undefined): Theme {
  return isTheme(value) ? value : defaultTheme;
}

/** Applies a theme at once and keeps it for the next visit. */
export function saveTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
}
