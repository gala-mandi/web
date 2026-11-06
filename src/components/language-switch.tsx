"use client";

import { useTranslations } from "next-intl";
import { type Locale, localeNames, locales } from "@/i18n/config";
import { useChangeLocale } from "@/i18n/use-change-locale";
import { cn } from "@/lib/utils";

/**
 * English / اردو pill from the sign-in designs. Each language is written in
 * its own script (and `lang`), so it reads right whatever is chosen.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { locale, changeLocale, isPending } = useChangeLocale();
  return (
    <div
      role="group"
      aria-label={t("language")}
      aria-busy={isPending || undefined}
      className={cn(
        "bg-secondary inline-flex items-center gap-0.5 rounded-full p-1",
        className,
      )}
    >
      {locales.map((value: Locale) => {
        const active = value === locale;
        return (
          <button
            key={value}
            type="button"
            lang={value}
            aria-pressed={active}
            onClick={() => changeLocale(value)}
            className={cn(
              "focus-visible:ring-ring/30 inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors focus-visible:ring-4 focus-visible:outline-none",
              value === "ur" ? "font-urdu leading-none" : "font-sans",
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(30_27_46/0.12)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {localeNames[value]}
          </button>
        );
      })}
    </div>
  );
}
