import type { ReportRange } from "@/features/dashboard/types";

/**
 * Date-range presets of the reports, on Asia/Karachi calendar days
 * (`YYYY-MM-DD`). Calendar maths on dates only; no money is touched.
 */

export const rangePresets = ["today", "week", "month"] as const;
export type RangePreset = (typeof rangePresets)[number] | "custom";

/** Longest range one report request may cover (the server's limit). */
export const MAX_REPORT_DAYS = 366;

const toUtc = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);

/** `YYYY-MM-DD` ± days. */
export function shiftDay(day: string, days: number): string {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return toDay(date);
}

/** Days from `from` to `to`, both included: the same day → 1. */
export function daysIn(from: string, to: string): number {
  return (toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000 + 1;
}

/** The Monday on or before `day` (weeks run Monday to Sunday). */
export function weekStart(day: string): string {
  const weekday = toUtc(day).getUTCDay(); // 0 = Sunday
  return shiftDay(day, -((weekday + 6) % 7));
}

/**
 * The range of a preset, ending today: today only, Monday of this week
 * to today, or the 1st of this month to today.
 */
export function presetRange(
  preset: Exclude<RangePreset, "custom">,
  today: string,
): ReportRange {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: weekStart(today), to: today };
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today };
  }
}

/**
 * Which preset a range is ("custom" for any other range). Today wins over
 * this week on a Monday, and this week over this month on the 1st.
 */
export function presetOf(range: ReportRange, today: string): RangePreset {
  for (const preset of rangePresets) {
    const r = presetRange(preset, today);
    if (r.from === range.from && r.to === range.to) return preset;
  }
  return "custom";
}

/**
 * The range a report shows: `?from=&to=` from the URL, else the default
 * preset. A lone `to` means that day; a lone `from` runs to today.
 */
export function resolveRange(
  url: { from: string | null; to: string | null },
  today: string,
  fallback: Exclude<RangePreset, "custom">,
): ReportRange {
  if (!url.from && !url.to) return presetRange(fallback, today);
  const to = url.to ?? today;
  return { from: url.from ?? to, to };
}
