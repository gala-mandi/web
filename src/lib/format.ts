/** Shop time zone: the server stores UTC, the UI shows Pakistan time. */
export const SHOP_TIME_ZONE = "Asia/Karachi";

const dateTime = new Intl.DateTimeFormat("en-PK", {
  timeZone: SHOP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat("en-PK", {
  timeZone: SHOP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `12 Oct 2026, 3:05 pm` in Asia/Karachi. */
export function formatDateTime(value: string | Date): string {
  const date = toDate(value);
  return date ? dateTime.format(date) : "";
}

/** `12 Oct 2026` in Asia/Karachi. */
export function formatDate(value: string | Date): string {
  const date = toDate(value);
  return date ? dateOnly.format(date) : "";
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** `in 2 days`, `3 hours ago`, `now`. */
export function formatRelative(
  value: string | Date,
  now: number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return "";
  const diff = date.getTime() - now;
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms)
      return relative.format(Math.round(diff / ms), unit);
  }
  return relative.format(0, "minute");
}
