/**
 * Shapes of the reports API the dashboard reads (server ticket 30,
 * `src/modules/reports/reports.dto.ts`). Money is a rupee string with 2
 * decimals, weight a kg string with 3 decimals, dates `YYYY-MM-DD` in
 * Asia/Karachi.
 */
import type { Rate } from "@/features/rates/types";
import type { TraderType } from "@/features/traders/types";

/** Commission (or another charge) on purchases, on sales, and both. */
export interface Sides {
  purchases: string;
  sales: string;
  total: string;
}

interface VoucherTotals {
  count: number;
  amount: string;
}

/** `GET /reports/daily-summary?date=` (the date defaults to today). */
export interface DailySummary {
  date: string;
  purchases: {
    bills: number;
    bags: number;
    weightKg: string;
    grossAmount: string;
    totalDeductions: string;
    netAmount: string;
    paidOnBills: string;
  };
  sales: {
    bills: number;
    bags: number;
    weightKg: string;
    grossAmount: string;
    totalCharges: string;
    netAmount: string;
    receivedOnBills: string;
  };
  commission: Sides;
  payments: { paid: VoucherTotals; received: VoucherTotals };
  /** The day's cash book (cash vouchers only); `closingCash` = cash in hand. */
  cash: {
    openingCash: string;
    cashIn: string;
    cashOut: string;
    closingCash: string;
  };
  cancelled: { purchases: number; sales: number; payments: number };
  rates: Rate[];
}

export type ReportGroup = "day" | "commodity" | "trader";

interface LineMetrics {
  bills: number;
  bags: number;
  weightKg: string;
  grossAmount: string;
  /** Bill-level; `null` when bills are split by commodity. */
  netAmount: string | null;
}

/** One group of a purchases or sales report: a day, or a commodity or trader. */
export interface BookRow extends LineMetrics {
  /** The date for days; the id for commodities and traders. */
  key: string;
  /** The date for days; the name for commodities and traders. */
  label: string;
}

/** `GET /reports/purchases` and `GET /reports/sales` (shared fields). */
export interface BookReport {
  from: string;
  to: string;
  groupBy: ReportGroup;
  commodity: string | null;
  trader: string | null;
  /** Only groups with bills; days oldest first, names A–Z. */
  rows: BookRow[];
  totals: LineMetrics;
}

export interface BookReportQuery {
  from: string;
  to: string;
  groupBy: ReportGroup;
}

export interface OutstandingTrader {
  traderId: string;
  type: TraderType;
  name: string;
  phone: string | null;
  /** Rupees, always positive. */
  amount: string;
}

export interface OutstandingSide {
  /** Every trader on this side, whatever `limit` is. */
  total: string;
  count: number;
  /** Largest first, at most `limit`. */
  traders: OutstandingTrader[];
}

/** `GET /reports/outstanding?limit=` */
export interface OutstandingReport {
  asOf: string | null;
  /** Traders who owe the shop. */
  receivable: OutstandingSide;
  /** Traders the shop owes. */
  payable: OutstandingSide;
}
