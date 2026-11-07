"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import type { SheetWords } from "./sheet";

/** The words and language report sheets are built in (screen, print, Excel). */
export function useSheetWords(): SheetWords {
  const t = useTranslations("reports");
  const tp = useTranslations("payments");
  const locale = useLocale();
  return useMemo(() => ({ t, tp, locale }), [t, tp, locale]);
}
