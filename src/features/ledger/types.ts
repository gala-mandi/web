/** Shapes of the ledger (khata) API (see the ledger contract, server ticket 26). */

import type { TraderType } from "@/features/traders/types";

export const sourceTypes = [
  "opening",
  "purchase",
  "sale",
  "payment",
  "receipt",
  "adjustment",
  "reversal",
] as const;
/** What wrote a khata line. */
export type SourceType = (typeof sourceTypes)[number];

/** One khata line. Append-only: a mistake is corrected by a new line. */
export interface LedgerEntry {
  id: number;
  traderId: string;
  /** Asia/Karachi day, e.g. "2026-11-06". */
  entryDate: string;
  sourceType: SourceType;
  /** The purchase / sale / payment behind it (the trader, for opening). */
  sourceId: string | null;
  /** Rupees, e.g. "100000.00"; one side is "0.00". */
  debit: string;
  credit: string;
  /** e.g. "Purchase PUR-2026-27-000001"; the reason of an adjustment. */
  narration: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** A statement line with the running balance after it. */
export interface StatementEntry extends LedgerEntry {
  /** Debit − credit so far, e.g. "-60000.00". */
  balance: string;
}

/** `GET /ledger/:traderId`. */
export interface Statement {
  trader: { id: string; type: TraderType; name: string };
  from: string | null;
  to: string | null;
  /**
   * Debit − credit: positive = the trader owes the shop, negative = the shop
   * owes the trader. Opening = before `from`; closing = at the end of `to`.
   */
  openingBalance: string;
  closingBalance: string;
  /** This page's entries in date order. */
  data: StatementEntry[];
  meta: { page: number; limit: number; total: number };
}

/** Query of `GET /ledger/:traderId` (from/to inclusive). */
export interface StatementQuery {
  from?: string;
  to?: string;
  page: number;
  /** 1..500 */
  limit: number;
}

/** The server's largest statement page. */
export const STATEMENT_MAX_LIMIT = 500;

/** One row of `GET /ledger/balances`. */
export interface TraderBalance {
  traderId: string;
  type: TraderType;
  name: string;
  phone: string | null;
  /** Debit − credit, e.g. "-60000.00". */
  balance: string;
  /** What the trader owes the shop ("0.00" when nothing). */
  receivable: string;
  /** What the shop owes the trader ("0.00" when nothing). */
  payable: string;
}

/** `GET /ledger/balances`. */
export interface Balances {
  data: TraderBalance[];
  /** Every trader matching the filters, not only this page. */
  totals: { receivable: string; payable: string };
  meta: { page: number; limit: number; total: number };
}

export const balanceSortFields = ["name", "balance"] as const;
export type BalanceSortField = (typeof balanceSortFields)[number];
export type BalanceSort = BalanceSortField | `-${BalanceSortField}`;

/** Query of `GET /ledger/balances`. */
export interface BalancesQuery {
  page: number;
  /** 1..100 */
  limit: number;
  /** Name or phone. */
  search?: string;
  type?: TraderType;
  sort?: BalanceSort;
}
