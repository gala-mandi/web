/** Shapes of the payments API (see the payments contract, server ticket 28). */

import type { PurchaseStatus } from "@/features/purchases/types";

/** paid: to a kissan (settles purchases); received: from a beopari (sales). */
export const paymentDirections = ["paid", "received"] as const;
export type PaymentDirection = (typeof paymentDirections)[number];

export const paymentMethods = ["cash", "bank", "cheque", "online"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

/** Same `doc_status` as bills; the server never creates a draft. */
export type PaymentStatus = PurchaseStatus;

/** One row of `GET /payments`. */
export interface PaymentSummary {
  id: string;
  /** PAY-2026-27-000123 (paid) or RCT-2026-27-000123 (received). */
  voucherNo: string;
  direction: PaymentDirection;
  /** Asia/Karachi day, e.g. "2026-11-06". */
  paymentDate: string;
  trader: { id: string; name: string };
  /** Rupees, e.g. "40000.00"; the whole amount is in the khata. */
  amount: string;
  /** The part settling bills. */
  allocated: string;
  /** The part no bill takes (peshgi). */
  advance: string;
  method: PaymentMethod;
  /** Cheque number, bank or transfer reference. */
  reference: string | null;
  /** A cancelled voucher's allocations no longer count. */
  status: PaymentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One bill a voucher settles. */
export interface PaymentAllocation {
  id: string;
  purchaseId: string | null;
  saleId: string | null;
  billNo: string;
  /** The bill's own date. */
  billDate: string;
  amount: string;
}

/** `GET /payments/:id` and what cancel returns. */
export interface Payment extends PaymentSummary {
  allocations: PaymentAllocation[];
  createdBy: string | null;
}

export const OVERPAYMENT = "OVERPAYMENT";

/** Saved as an advance, but the user should know (shop setting "advance"). */
export interface PaymentWarning {
  code: typeof OVERPAYMENT;
  message: string;
  /** What the khata owed before this payment, e.g. "100000.00". */
  owed: string;
  /** The amount above it, now an advance, e.g. "20000.00". */
  excess: string;
}

/** What a create returns: the payment and the warnings of that save. */
export interface PaymentWithWarnings extends Payment {
  warnings: PaymentWarning[];
}

/** One bill line of `POST /payments`: no amount = as much as is left. */
export type AllocationInput = (
  | { purchaseId: string; saleId?: never }
  | { saleId: string; purchaseId?: never }
) & { amount?: string };

/** Body of `POST /payments`. */
export interface CreatePaymentInput {
  direction: PaymentDirection;
  traderId: string;
  /** Default today (Asia/Karachi); never in the future. */
  paymentDate?: string;
  amount: string;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  /** Bills it settles, in this order; none = all of it is an advance. */
  allocations?: AllocationInput[];
}

/** What a create returns, and whether this Idempotency-Key saved it before. */
export interface SavedPayment {
  payment: PaymentWithWarnings;
  /** 200: the same Idempotency-Key was already saved (a retry). */
  replayed: boolean;
}

export const paymentSortFields = ["paymentDate", "voucherNo"] as const;
export type PaymentSortField = (typeof paymentSortFields)[number];

/** Query of `GET /payments` (from/to inclusive). */
export interface PaymentListQuery {
  page: number;
  /** 1..100 */
  limit: number;
  /** Voucher number, or the trader's name or phone. */
  search?: string;
  from?: string;
  to?: string;
  direction?: PaymentDirection;
  trader?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  sort?: PaymentSortField | `-${PaymentSortField}`;
}

/** One day of the cash book (days with cash vouchers only). */
export interface CashBookDay {
  date: string;
  /** Cash received from beoparis. */
  cashIn: string;
  /** Cash paid to kissans. */
  cashOut: string;
  closingCash: string;
}

/** `GET /payments/cash-book`: posted cash vouchers only. */
export interface CashBook {
  from: string;
  to: string;
  /** Cash in hand at the start of `from`: every cash voucher before it. */
  openingCash: string;
  /** Oldest first. */
  days: CashBookDay[];
  totals: { cashIn: string; cashOut: string };
  closingCash: string;
}

/** Query of `GET /payments/cash-book`; at most 366 days. */
export interface CashBookQuery {
  from: string;
  to: string;
}
