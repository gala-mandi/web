import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Cookies behind the interface language (none is secret or httpOnly):
 * - `gm_uid`: id of the user signed in on this browser (cleared on sign-out);
 * - `gm_locale_<userId>`: that user's own choice from the language switch;
 * - `gm_shop_locale_<userId>`: their shop's default (`tenant_settings.language`)
 *   as last read from the settings API;
 * - `gm_locale`: the language this browser used last (the sign-in screens).
 */
export const USER_COOKIE = "gm_uid";
export const LAST_LOCALE_COOKIE = "gm_locale";
export const userLocaleCookie = (userId: string) => `gm_locale_${userId}`;
export const shopLocaleCookie = (userId: string) => `gm_shop_locale_${userId}`;

/** A year: the choice should outlive the session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** User ids are UUIDs; anything else is ignored rather than used in a name. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export interface LocaleSources {
  /** The signed-in user's own choice on this browser. */
  user?: string | null;
  /** The shop's default language from Settings. */
  shop?: string | null;
  /** The language this browser used last. */
  last?: string | null;
}

/**
 * The interface language: the user's own choice, else the shop's default,
 * else the language last used on this browser, else English. Unknown values
 * are skipped.
 */
export function resolveLocale({ user, shop, last }: LocaleSources): Locale {
  for (const value of [user, shop, last]) {
    if (isLocale(value)) return value;
  }
  return defaultLocale;
}

/** The sources for the cookies of one request (server) or `document.cookie`. */
export function localeSources(
  get: (name: string) => string | undefined,
): LocaleSources {
  const userId = get(USER_COOKIE);
  const signedIn = userId !== undefined && SAFE_ID.test(userId);
  return {
    user: signedIn ? get(userLocaleCookie(userId)) : null,
    shop: signedIn ? get(shopLocaleCookie(userId)) : null,
    last: get(LAST_LOCALE_COOKIE),
  };
}

export function isSafeUserId(userId: string): boolean {
  return SAFE_ID.test(userId);
}
