"use client";

import { useTranslations } from "next-intl";
import { useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { isTheme, saveTheme, type Theme, themes } from "@/lib/theme";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentTheme(): Theme | null {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : null;
}

/**
 * The theme swatches under the sign-in form (screen 1.1): six buttons, each
 * painted in its own theme (`data-theme` on the swatch), the chosen one ringed.
 * The choice applies at once and stays on this browser (cookie).
 */
export function ThemePicker({ className }: { className?: string }) {
  const t = useTranslations("auth.login.theme");
  // The server renders without a choice; the browser reads <html data-theme>.
  const active = useSyncExternalStore(subscribe, currentTheme, () => null);
  const pick = useCallback((theme: Theme) => {
    saveTheme(theme);
    for (const listener of listeners) listener();
  }, []);

  return (
    <div
      role="group"
      aria-labelledby="theme-picker-label"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2",
        className,
      )}
    >
      <span
        id="theme-picker-label"
        className="text-muted-foreground text-[13px] font-semibold"
      >
        {t("label")}
      </span>
      <div className="flex flex-wrap gap-2">
        {themes.map((theme) => {
          const on = theme === active;
          return (
            <button
              key={theme}
              type="button"
              data-theme={theme}
              aria-label={t(theme)}
              aria-pressed={on}
              onClick={() => pick(theme)}
              className={cn(
                "bg-primary-to border-card size-11 cursor-pointer rounded-[9px] border-2 sm:size-[30px]",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                on ? "ring-primary ring-2" : "ring-border ring-1",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
