"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useCallback, useTransition } from "react";
import { useSessionStore } from "@/stores/session";
import type { Locale } from "./config";
import { saveLocaleChoice } from "./client";

/**
 * Switches the interface language: saves the choice for the signed-in user
 * on this browser (or just as this browser's last language on the sign-in
 * screens) and re-renders the page on the server in that language. Page
 * state (typed form values, open tabs) stays.
 */
export function useChangeLocale(): {
  locale: Locale;
  changeLocale: (locale: Locale) => void;
  isPending: boolean;
} {
  const locale = useLocale();
  const router = useRouter();
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const changeLocale = useCallback(
    (next: Locale) => {
      saveLocaleChoice(next, userId);
      if (next === locale) return;
      startTransition(() => router.refresh());
    },
    [locale, router, userId],
  );
  return { locale, changeLocale, isPending };
}
