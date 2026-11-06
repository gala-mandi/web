"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useState } from "react";
import { parseAsDay } from "@/components/data-table";
import type { ReportRange } from "@/features/dashboard/types";
import { traderTypes } from "@/features/traders/types";
import { karachiToday } from "@/lib/format";
import { presetOf, presetRange, type RangePreset, resolveRange } from "./range";

/**
 * The reports keep their filters in the URL (`?from=&to=`, …), so a reload
 * or a shared link opens the same report. Module-scope parsers: nuqs needs
 * them stable.
 */

export const reportGroups = ["day", "commodity", "trader"] as const;

const rangeParams = { from: parseAsDay, to: parseAsDay };
const bookParams = {
  groupBy: parseAsStringLiteral(reportGroups).withDefault("day"),
  commodity: parseAsString,
  trader: parseAsString,
};
const outstandingParams = {
  asOf: parseAsDay,
  type: parseAsStringLiteral(traderTypes),
};
const dayParams = { date: parseAsDay };

/** Today in Asia/Karachi, read once per page. */
export function useToday(): string {
  const [today] = useState(() => karachiToday());
  return today;
}

export interface ReportRangeState {
  today: string;
  range: ReportRange;
  preset: RangePreset;
  setPreset: (preset: Exclude<RangePreset, "custom">) => void;
  setRange: (range: { from: string | null; to: string | null }) => void;
}

/** `?from=&to=`; without them, the `fallback` preset (this month). */
export function useReportRange(
  fallback: Exclude<RangePreset, "custom"> = "month",
): ReportRangeState {
  const today = useToday();
  const [url, setUrl] = useQueryStates(rangeParams, { history: "push" });
  const range = resolveRange(url, today, fallback);
  return {
    today,
    range,
    preset: presetOf(range, today),
    setPreset: (preset) => void setUrl(presetRange(preset, today)),
    setRange: (next) => void setUrl(next),
  };
}

/** `?groupBy=&commodity=&trader=` of the purchases and sales reports. */
export function useBookFilters() {
  return useQueryStates(bookParams, { history: "push" });
}

/** `?asOf=&type=` of the outstanding report. */
export function useOutstandingFilters() {
  return useQueryStates(outstandingParams, { history: "push" });
}

/** `?date=` of the daily summary (default today). */
export function useReportDay() {
  const today = useToday();
  const [url, setUrl] = useQueryStates(dayParams, { history: "push" });
  return {
    today,
    /** The day shown. */
    date: url.date ?? today,
    /** The day in the URL; null for today. */
    value: url.date === today ? null : url.date,
    setDate: (date: string | null) =>
      void setUrl({ date: date === today ? null : date }),
  };
}
