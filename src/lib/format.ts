import {
  defaultLocale,
  intlLocale,
  type Locale,
  localizeDigits,
} from "@/i18n/config";

/**
 * Dates, money and weights for the screen and print, in the interface
 * language (`locale`, English when not given). Digits follow the one switch
 * in `src/i18n/config.ts` (Western 0-9 for Urdu).
 */

/** Shop time zone: the server stores UTC, the UI shows Pakistan time. */
export const SHOP_TIME_ZONE = "Asia/Karachi";

/** Short unit words per language: "Rs 1,200.00" / "1,200.00 روپے". */
export const unitWords = {
  en: { rs: "Rs", maund: "mn", kg: "kg" },
  ur: { rs: "روپے", maund: "من", kg: "کلو" },
} as const satisfies Record<Locale, { rs: string; maund: string; kg: string }>;

const formatters = new Map<string, Intl.DateTimeFormat>();

/** One cached `Intl.DateTimeFormat` per language and option set. */
export function dateFormat(
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone: SHOP_TIME_ZONE,
      ...options,
    });
    formatters.set(key, format);
  }
  return format;
}

const numberFormatters = new Map<string, Intl.NumberFormat>();

/** One cached `Intl.NumberFormat` per language and option set. */
export function numberFormat(
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormatters.get(key);
  if (!format) {
    format = new Intl.NumberFormat(intlLocale(locale), options);
    numberFormatters.set(key, format);
  }
  return format;
}

/** A count (bills, bags, items): `1,250`. */
export function formatCount(
  value: number,
  locale: Locale = defaultLocale,
): string {
  return numberFormat(locale).format(value);
}

const DATE_TIME: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const DATE_ONLY: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar day in Asia/Karachi, e.g. `2026-11-06`. */
export function karachiToday(now: Date = new Date()): string {
  return isoDay.format(now);
}

const relativeFormatters = new Map<Locale, Intl.RelativeTimeFormat>();

function relativeFormat(locale: Locale): Intl.RelativeTimeFormat {
  let format = relativeFormatters.get(locale);
  if (!format) {
    format = new Intl.RelativeTimeFormat(intlLocale(locale), {
      numeric: "auto",
    });
    relativeFormatters.set(locale, format);
  }
  return format;
}

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * In Urdu the clock keeps its Latin "3:05 PM": isolated left to right, so
 * it doesn't read "PM 3:05" inside right-to-left text.
 */
export function isolateClock(text: string, locale: Locale): string {
  return locale === "ur"
    ? text.replace(
        /\d{1,2}:\d{2}(?:\s?[AP]M)?/g,
        (time) => `\u2066${time}\u2069`,
      )
    : text;
}

/** `12 Oct 2026, 3:05 pm` / `12 اکتوبر، 2026، 3:05 PM` in Asia/Karachi. */
export function formatDateTime(
  value: string | Date,
  locale: Locale = defaultLocale,
): string {
  const date = toDate(value);
  return date
    ? isolateClock(dateFormat(locale, DATE_TIME).format(date), locale)
    : "";
}

/** `12 Oct 2026` / `12 اکتوبر، 2026` in Asia/Karachi. */
export function formatDate(
  value: string | Date,
  locale: Locale = defaultLocale,
): string {
  const date = toDate(value);
  return date ? dateFormat(locale, DATE_ONLY).format(date) : "";
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** `in 2 days`, `3 hours ago`, `this minute` (`3 گھنٹے پہلے` in Urdu). */
export function formatRelative(
  value: string | Date,
  now: number = Date.now(),
  locale: Locale = defaultLocale,
): string {
  const date = toDate(value);
  if (!date) return "";
  const relative = relativeFormat(locale);
  const diff = date.getTime() - now;
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms)
      return relative.format(Math.round(diff / ms), unit);
  }
  return relative.format(0, "minute");
}

/** "12.500" → 12500 (thousandths), without float rounding. Null if not a decimal. */
function toThousandths(value: string | number): number | null {
  const match = /^(\d+)(?:\.(\d{0,3})\d*)?$/.exec(String(value).trim());
  if (!match) return null;
  return Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
}

/**
 * A weight in kg as maund + kg, e.g. `12 mn 15 kg`, `25 mn`, `15 kg`
 * (`12 من 15 کلو` in Urdu). `maundKg` is the shop's setting (40 unless the
 * owner changed it).
 */
export function formatMaund(
  kg: string | number,
  maundKg: string | number = "40",
  locale: Locale = defaultLocale,
): string {
  const total = toThousandths(kg);
  const perMaund = toThousandths(maundKg);
  if (total === null || !perMaund) return "";
  const words = unitWords[locale];
  const kgNumber = numberFormat(locale, { maximumFractionDigits: 3 });
  const maunds = Math.floor(total / perMaund);
  const rest = total - maunds * perMaund;
  const kgPart = `${kgNumber.format(rest / 1000)} ${words.kg}`;
  if (maunds === 0) return kgPart;
  const mnPart = `${kgNumber.format(maunds)} ${words.maund}`;
  return rest === 0 ? mnPart : `${mnPart} ${kgPart}`;
}

/**
 * Rupees as the server sends them (a decimal string, e.g. `"50000.5"`) →
 * `Rs 50,000.50`; a negative amount gets a leading minus (`-Rs 1,200.00`).
 * In Urdu the word follows the number, as it is read: `50,000.50 روپے`,
 * `-1,200.00 روپے`. The integer and decimal parts are formatted as text, so
 * no float maths touches the amount; more than 2 decimals are cut, never
 * rounded. Returns "" for anything that isn't a plain decimal.
 */
export function formatRs(
  value: string | null | undefined,
  locale: Locale = defaultLocale,
): string {
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec((value ?? "").trim());
  if (!match) return "";
  const [, sign, rawInt, rawDec = ""] = match;
  const int = rawInt.replace(/^0+(?=\d)/, "");
  const dec = rawDec.padEnd(2, "0").slice(0, 2);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const negative = sign === "-" && /[1-9]/.test(int + dec);
  const minus = negative ? "-" : "";
  if (locale === "ur") {
    return localizeDigits(
      `${minus}${grouped}.${dec} ${unitWords.ur.rs}`,
      locale,
    );
  }
  return `${minus}Rs ${grouped}.${dec}`;
}

/**
 * A weight in kg as the server sends it (a decimal string, e.g. `"1250.500"`)
 * → `1,250.5 kg` (`1,250.5 کلو`): trailing zeros go, at most 3 decimals
 * (cut, never rounded), no float maths. Returns "" for anything that isn't a
 * plain decimal.
 */
export function formatKg(
  value: string | null | undefined,
  locale: Locale = defaultLocale,
): string {
  const match = /^(\d+)(?:\.(\d*))?$/.exec((value ?? "").trim());
  if (!match) return "";
  const [, rawInt, rawDec = ""] = match;
  const int = rawInt.replace(/^0+(?=\d)/, "");
  const dec = rawDec.slice(0, 3).replace(/0+$/, "");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return localizeDigits(
    `${grouped}${dec ? `.${dec}` : ""} ${unitWords[locale].kg}`,
    locale,
  );
}
