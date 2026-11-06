import Decimal from "decimal.js";
import { addDays, datesBetween } from "@/features/rates/values";
import type {
  BookReport,
  BookRow,
  DailySummary,
  OutstandingReport,
} from "./types";

/** Days in the purchases vs sales chart, today included. */
export const TREND_DAYS = 30;

/** How many commodities the rates card shows. */
export const TOP_COMMODITIES = 3;

/** Rows per side in the receivables and payables lists. */
export const OUTSTANDING_LIMIT = 10;

/** The first day of the `TREND_DAYS`-long period that ends on `today`. */
export function trendFrom(today: string): string {
  return addDays(today, -(TREND_DAYS - 1));
}

/** One day of the purchases vs sales chart. */
export interface DayPoint {
  date: string;
  /** Net amounts as the server sent them ("0.00" on a day without bills). */
  purchases: string;
  sales: string;
  purchaseBills: number;
  saleBills: number;
  /**
   * Plot positions only (Recharts needs numbers). Nothing is calculated from
   * them: the tooltip and totals show the strings above.
   */
  purchasesY: number;
  salesY: number;
}

const ZERO = "0.00";

function byDay(report: BookReport | undefined): Map<string, BookRow> {
  return new Map((report?.rows ?? []).map((row) => [row.key, row]));
}

/**
 * One point per calendar day from `from` to `to`. The reports list only days
 * with bills, so the other days are filled with zero (no bills is a real 0).
 */
export function dailySeries(
  purchases: BookReport | undefined,
  sales: BookReport | undefined,
  from: string,
  to: string,
): DayPoint[] {
  const bought = byDay(purchases);
  const sold = byDay(sales);
  return datesBetween(from, to).map((date) => {
    const p = bought.get(date);
    const s = sold.get(date);
    const pNet = p?.netAmount ?? ZERO;
    const sNet = s?.netAmount ?? ZERO;
    return {
      date,
      purchases: pNet,
      sales: sNet,
      purchaseBills: p?.bills ?? 0,
      saleBills: s?.bills ?? 0,
      purchasesY: Number(pNet),
      salesY: Number(sNet),
    };
  });
}

export interface TopCommodity {
  id: string;
  name: string;
}

/**
 * The commodities with the most weight in a by-commodity report, heaviest
 * first (ties by name). Weights are compared as decimals, never floats.
 */
export function topCommodities(
  report: BookReport | undefined,
  limit: number = TOP_COMMODITIES,
): TopCommodity[] {
  return [...(report?.rows ?? [])]
    .sort(
      (a, b) =>
        new Decimal(b.weightKg).cmp(a.weightKg) ||
        a.label.localeCompare(b.label),
    )
    .slice(0, limit)
    .map((row) => ({ id: row.key, name: row.label }));
}

/** "0", "0.00", "-0.00" → true. For decimal strings from the server. */
export function isZeroAmount(value: string | null | undefined): boolean {
  return /^-?0*(\.0*)?$/.test((value ?? "").trim());
}

/**
 * A shop with nothing to show yet: no bills or vouchers today, no cash, no
 * bills in the last 30 days and no khata balances. The server answers zeros
 * and empty lists for such a shop, never 404.
 */
export function isEmptyShop(
  summary: DailySummary,
  purchases: BookReport,
  sales: BookReport,
  outstanding: OutstandingReport,
): boolean {
  return (
    summary.purchases.bills === 0 &&
    summary.sales.bills === 0 &&
    summary.payments.paid.count === 0 &&
    summary.payments.received.count === 0 &&
    isZeroAmount(summary.cash.closingCash) &&
    purchases.rows.length === 0 &&
    sales.rows.length === 0 &&
    outstanding.receivable.count === 0 &&
    outstanding.payable.count === 0
  );
}

/**
 * Length of a list bar as a share of the largest amount (0..1). A plot
 * position only: the amount itself is always shown as the server sent it.
 */
export function barShare(amount: string, largest: string): number {
  const max = Number(largest);
  const value = Number(amount);
  if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value / max));
}
