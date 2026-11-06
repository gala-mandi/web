/**
 * The interface languages and everything that depends on them. Kept free of
 * React and Next imports so the server (request config), the client
 * (switch, sync) and plain modules (Excel, print) share one source.
 */

export const locales = ["en", "ur"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/** Urdu is written right to left. */
export const localeDirection = {
  en: "ltr",
  ur: "rtl",
} as const satisfies Record<Locale, "ltr" | "rtl">;

/**
 * THE digit switch for Urdu. `"latn"` prints Western digits (0-9): shops and
 * banks in Pakistan read amounts, weights, bill and phone numbers in Western
 * digits, and mixing scripts inside a number invites mistakes. Set it to
 * `"arabext"` for Eastern Arabic-Indic digits (۰-۹) everywhere at once:
 * money, weights, dates and counts all read it from here.
 */
export const URDU_DIGITS: "latn" | "arabext" = "latn";

/**
 * The `Intl` locale for a UI language: Pakistani English or Pakistani Urdu
 * (Urdu month names), with the digits chosen above.
 */
export function intlLocale(locale: Locale): string {
  return locale === "ur" ? `ur-PK-u-nu-${URDU_DIGITS}` : "en-PK";
}

const EASTERN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Digits in text built without `Intl` (money, weights) follow the switch. */
export function localizeDigits(text: string, locale: Locale): string {
  if (locale !== "ur" || URDU_DIGITS === "latn") return text;
  return text.replace(/\d/g, (d) => EASTERN_DIGITS[Number(d)]);
}

/** Every language shown in its own script, e.g. on the switch. */
export const localeNames = {
  en: "English",
  ur: "اردو",
} as const satisfies Record<Locale, string>;
