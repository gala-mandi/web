"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import type { User } from "@/features/auth/types";
import { useSettings } from "@/features/settings/hooks";
import { useCan } from "@/lib/can";
import {
  rememberSignedInUser,
  saveLastLocale,
  saveShopLocale,
  wantedLocale,
} from "./client";

/**
 * Keeps the interface language right for the signed-in user: remembers who
 * is signed in on this browser, caches the shop's default language from
 * Settings (owners can read it), and when the cookies now ask for another
 * language than the page was rendered in (first sign-in, shop default
 * changed) re-renders the page on the server once.
 */
export function LocaleSync({ user }: { user: Pick<User, "id"> | null }) {
  const locale = useLocale();
  const router = useRouter();
  const canReadSettings = useCan("settings.manage");
  const settings = useSettings({ enabled: canReadSettings && user !== null });
  const shopLanguage = settings.data?.language;
  const refreshedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    rememberSignedInUser(user.id);
    if (shopLanguage) saveShopLocale(user.id, shopLanguage);
    const wanted = wantedLocale();
    saveLastLocale(wanted);
    if (wanted !== locale && refreshedFor.current !== wanted) {
      refreshedFor.current = wanted;
      router.refresh();
    }
  }, [user, shopLanguage, locale, router]);

  return null;
}
