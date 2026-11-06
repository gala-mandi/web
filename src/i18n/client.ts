import type { Locale } from "./config";
import {
  isSafeUserId,
  LAST_LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  localeSources,
  resolveLocale,
  shopLocaleCookie,
  USER_COOKIE,
  userLocaleCookie,
} from "./resolve";

/** Browser side of the language cookies (see `resolve.ts`). */

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const cookie = part.trim();
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }
  return undefined;
}

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

/** The user signed in on this browser, so the server renders their language. */
export function rememberSignedInUser(userId: string): void {
  if (isSafeUserId(userId) && readCookie(USER_COOKIE) !== userId) {
    writeCookie(USER_COOKIE, userId);
  }
}

/** On sign-out: the sign-in screen goes back to the last language used. */
export function forgetSignedInUser(): void {
  deleteCookie(USER_COOKIE);
}

/**
 * Saves a choice from the language switch: for the signed-in user (when
 * there is one) and as this browser's last language.
 */
export function saveLocaleChoice(locale: Locale, userId?: string | null): void {
  if (userId && isSafeUserId(userId))
    writeCookie(userLocaleCookie(userId), locale);
  writeCookie(LAST_LOCALE_COOKIE, locale);
}

/** The shop's default language as the settings API returned it. */
export function saveShopLocale(userId: string, locale: Locale): void {
  if (!isSafeUserId(userId)) return;
  if (readCookie(shopLocaleCookie(userId)) !== locale) {
    writeCookie(shopLocaleCookie(userId), locale);
  }
}

/** Remembers the language in use as this browser's last one. */
export function saveLastLocale(locale: Locale): void {
  if (readCookie(LAST_LOCALE_COOKIE) !== locale) {
    writeCookie(LAST_LOCALE_COOKIE, locale);
  }
}

/** The language the cookies ask for right now (same rule as the server). */
export function wantedLocale(): Locale {
  return resolveLocale(localeSources(readCookie));
}
