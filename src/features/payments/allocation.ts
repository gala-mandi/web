import Decimal from "decimal.js";
import type { PurchaseSummary } from "@/features/purchases/types";
import type { SaleSummary } from "@/features/sales/types";

/**
 * The payment form's preview of how an amount settles a trader's bills.
 * The server decides on save (it fills bills in the order sent, each with
 * min(bill outstanding, amount left)); this applies the same rule with
 * decimal.js so the split is shown while typing. No float maths.
 */

/** A posted bill with something still to pay (purchase) or receive (sale). */
export interface OutstandingBill {
  id: string;
  billNo: string;
  /** The bill's day, YYYY-MM-DD. */
  date: string;
  netAmount: string;
  /** What is left on it, from the server, e.g. "60000.00". */
  outstanding: string;
}

/** Rupees as the server takes them: up to 12 digits and 2 decimals. */
const MONEY = /^\d{1,12}(\.\d{1,2})?$/;

/** True for a typed amount the server accepts, e.g. "40000" or "40000.5". */
export function isMoney(value: string): boolean {
  return MONEY.test(value.trim());
}

/** A typed amount; blank or not an amount → 0. */
function typed(value: string | undefined): Decimal {
  const v = (value ?? "").trim();
  return MONEY.test(v) ? new Decimal(v) : new Decimal(0);
}

/** True when an amount is above 0 ("0.00" → false). */
export function isAboveZero(value: string | undefined): boolean {
  return typed(value).gt(0);
}

/**
 * Bills with something left, oldest first. The server lists them newest
 * first (date, then bill no, descending), so oldest first is that list
 * reversed: the same order the server would fill them in.
 */
export function oldestFirst(
  rows: readonly (PurchaseSummary | SaleSummary)[],
): OutstandingBill[] {
  return rows
    .filter((row) => isAboveZero(row.outstanding))
    .map((row) => ({
      id: row.id,
      billNo: row.billNo,
      date: "purchaseDate" in row ? row.purchaseDate : row.saleDate,
      netAmount: row.netAmount,
      outstanding: row.outstanding,
    }))
    .reverse();
}

/**
 * Auto-allocate oldest first: each bill takes min(outstanding, amount
 * left), in order, until the amount runs out. One share per bill ("0.00"
 * for a bill the amount doesn't reach).
 */
export function autoAllocate(
  amount: string,
  bills: readonly OutstandingBill[],
): string[] {
  let left = typed(amount);
  return bills.map((bill) => {
    const share = Decimal.min(new Decimal(bill.outstanding), left);
    left = left.minus(share);
    return share.toFixed(2);
  });
}

export interface AllocationTotals {
  /** What the bills take. */
  allocated: string;
  /** What no bill takes: the advance (peshgi). Negative when over. */
  advance: string;
  /** True when the bills take more than the amount. */
  over: boolean;
}

/** The amount, less what the bills take, is the advance. */
export function allocationTotals(
  amount: string,
  shares: readonly (string | undefined)[],
): AllocationTotals {
  const allocated = shares.reduce(
    (sum, share) => sum.plus(typed(share)),
    new Decimal(0),
  );
  const advance = typed(amount).minus(allocated);
  return {
    allocated: allocated.toFixed(2),
    advance: advance.toFixed(2),
    over: advance.lt(0),
  };
}

/** What is left on a bill after its share, e.g. "20000.00". */
export function leftAfter(bill: OutstandingBill, share: string | undefined) {
  return Decimal.max(
    new Decimal(bill.outstanding).minus(typed(share)),
    0,
  ).toFixed(2);
}

/** True when a share is more than the bill has left. */
export function isOverBill(
  bill: OutstandingBill,
  share: string | undefined,
): boolean {
  return typed(share).gt(bill.outstanding);
}

/** Sum of the bills' outstanding amounts. */
export function totalOutstanding(bills: readonly OutstandingBill[]): string {
  return bills
    .reduce((sum, bill) => sum.plus(bill.outstanding), new Decimal(0))
    .toFixed(2);
}

/** A typed share as sent: trimmed, blank → "" (not sent). */
export function cleanAmount(value: string | undefined): string {
  return (value ?? "").trim();
}
