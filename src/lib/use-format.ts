"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";
import type { Locale } from "@/i18n/config";
import {
  formatCount,
  formatDate,
  formatDateTime,
  formatKg,
  formatMaund,
  formatRelative,
  formatRs,
} from "./format";

/** The shared formatters bound to the interface language. */
export function formattersFor(locale: Locale) {
  return {
    locale,
    formatRs: (value: string | null | undefined) => formatRs(value, locale),
    formatMaund: (kg: string | number, maundKg?: string | number) =>
      formatMaund(kg, maundKg, locale),
    formatKg: (value: string | null | undefined) => formatKg(value, locale),
    formatDate: (value: string | Date) => formatDate(value, locale),
    formatDateTime: (value: string | Date) => formatDateTime(value, locale),
    formatRelative: (value: string | Date, now?: number) =>
      formatRelative(value, now, locale),
    formatCount: (value: number) => formatCount(value, locale),
  };
}

export type Formatters = ReturnType<typeof formattersFor>;

/**
 * `formatRs`, `formatMaund`, dates… in the interface language, e.g.
 * `const { formatRs, formatDate } = useFormat();`.
 */
export function useFormat(): Formatters {
  const locale = useLocale();
  return useMemo(() => formattersFor(locale), [locale]);
}
