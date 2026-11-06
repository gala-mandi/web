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
  /** Posted bills counted (a bill with two commodities counts in both rows). */
  bills: number;
  bags: number;
  /** kg, 3 decimals, e.g. "1000.000". */
  weightKg: string;
  /** Sum of the item amounts: the bills' gross amount. */
  grossAmount: string;
  /** Bill-level; `null` when bills are split by commodity. */
  netAmount: string | null;
}

/** A purchases row or total: what the kissans are owed (`netAmount`). */
export interface PurchaseMetrics extends LineMetrics {
  /** Bill-level; `null` when bills are split by commodity. */
  totalDeductions: string | null;
}

/** A sales row or total: what the beoparis owe (`netAmount`). */
export interface SaleMetrics extends LineMetrics {
  /** Bill-level; `null` when bills are split by commodity. */
  totalCharges: string | null;
}

interface GroupKey {
  /** The date for days; the id for commodities and traders. */
  key: string;
  /** The date for days; the name for commodities and traders. */
  label: string;
}

/** One group of a purchases or sales report: a day, or a commodity or trader. */
export type BookRow<M extends LineMetrics = LineMetrics> = M & GroupKey;

/** `GET /reports/purchases` and `GET /reports/sales`. */
export interface BookReport<M extends LineMetrics = LineMetrics> {
  from: string;
  to: string;
  groupBy: ReportGroup;
  commodity: string | null;
  trader: string | null;
  /** Only groups with bills; days oldest first, names A–Z. */
  rows: BookRow<M>[];
  totals: M;
}

export type PurchasesReport = BookReport<PurchaseMetrics>;
export type SalesReport = BookReport<SaleMetrics>;

/** `from`/`to` are Asia/Karachi days, both included; at most 366 days. */
export interface ReportRange {
  from: string;
  to: string;
}

export interface BookReportQuery extends ReportRange {
  groupBy: ReportGroup;
  /** Only the lines of this commodity (id). */
  commodity?: string;
  /** Only the bills of this kissan (purchases) or beopari (sales) (id). */
  trader?: string;
}

/** `GET /reports/commission`: commission charged on posted bills. */
export interface CommissionReport {
  from: string;
  to: string;
  /** Days with commission, oldest first. */
  days: (Sides & { date: string })[];
  /** The shop's commission income for the range. */
  totals: Sides;
  /** Other charge lines of the same bills; not shop income. */
  otherCharges: { marketFee: Sides; labour: Sides; other: Sides };
}

export interface OutstandingQuery {
  /** Balances at the end of this day; everything so far when left out. */
  asOf?: string;
  type?: TraderType;
  /** Largest N of each side; every trader when left out. */
  limit?: number;
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

/** `GET /reports/outstanding?asOf=&type=&limit=` */
export interface OutstandingReport {
  asOf: string | null;
  /** Traders who owe the shop. */
  receivable: OutstandingSide;
  /** Traders the shop owes. */
  payable: OutstandingSide;
}
