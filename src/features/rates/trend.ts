import type { Rate, RateUnit } from "./types";
import { addDays, datesBetween } from "./values";

/** Periods the trend chart offers, in days (today included). */
export const trendRanges = [7, 30, 90] as const;
export type TrendRange = (typeof trendRanges)[number];

/** One day of the chart. A day without a rate has nulls, never zeros. */
export interface TrendPoint {
  date: string;
  /** Rupee strings as the server sent them, for the tooltip. */
  minRate: string | null;
  maxRate: string | null;
  avgRate: string | null;
  /**
   * Plot positions only (Recharts needs numbers): the y of the min–max band
   * and of the avg line. Nothing is calculated from them.
   */
  band: [number, number] | null;
  avg: number | null;
}

/** The first day of a `days`-long period that ends on `today`. */
export function trendStart(today: string, days: TrendRange): string {
  return addDays(today, -(days - 1));
}

/**
 * One point per calendar day from `from` to `to`. Days with no saved rate
 * stay null, so the chart shows a gap there instead of dropping to zero.
 */
export function trendSeries(
  rates: Rate[],
  from: string,
  to: string,
): TrendPoint[] {
  const byDate = new Map(rates.map((r) => [r.rateDate, r]));
  return datesBetween(from, to).map((date) => {
    const rate = byDate.get(date);
    if (!rate) {
      return {
        date,
        minRate: null,
        maxRate: null,
        avgRate: null,
        band: null,
        avg: null,
      };
    }
    return {
      date,
      minRate: rate.minRate,
      maxRate: rate.maxRate,
      avgRate: rate.avgRate,
      band: [Number(rate.minRate), Number(rate.maxRate)],
      avg: rate.avgRate === null ? null : Number(rate.avgRate),
    };
  });
}

/** The unit of the newest rate (what the axis is labelled with). */
export function trendUnit(rates: Rate[]): RateUnit {
  return rates.at(-1)?.rateUnit ?? "maund";
}
