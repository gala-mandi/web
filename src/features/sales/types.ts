/** Shapes of the sales API (see the sales contract, server ticket 22). */

import type {
  ManualChargesInput,
  PurchaseCharge,
  PurchaseItem,
  PurchaseItemInput,
  PurchaseStatus,
} from "@/features/purchases/types";

export type { RateUnit } from "@/features/purchases/types";

/** Same `doc_status` as purchases; the server never creates a draft. */
export type SaleStatus = PurchaseStatus;

/** One row of `GET /sales`. */
export interface SaleSummary {
  id: string;
  /** e.g. "SAL-2026-27-000123"; kept when cancelled, never reused. */
  billNo: string;
  /** Asia/Karachi date, e.g. "2026-11-06". */
  saleDate: string;
  /** The beopari buying the goods. */
  buyer: { id: string; name: string };
  /** Rupees, e.g. "100000.00". */
  grossAmount: string;
  /** Added to the gross on a sale. */
  totalCharges: string;
  /** net − (gross + charges), e.g. "0.46". */
  rounding: string;
  /** Debited to the beopari's khata (the receivable), whole rupees. */
  netAmount: string;
  /** Received on the same save (credited back in the khata). */
  receivedAmount: string;
  /**
   * Still to receive from the beopari: net − received on save − live
   * receipt vouchers; "0.00" when cancelled.
   */
  outstanding: string;
  status: SaleStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem extends PurchaseItem {
  /** The kissan's lot (`purchase_items` id) it was sold from, if linked. */
  purchaseItemId: string | null;
}

export type SaleCharge = PurchaseCharge;

/** `GET /sales/:id` and what cancel returns. */
export interface Sale extends SaleSummary {
  items: SaleItem[];
  charges: SaleCharge[];
  createdBy: string | null;
}

export const CREDIT_LIMIT_EXCEEDED = "CREDIT_LIMIT_EXCEEDED";

/** Saved, but the user should know (the shop's setting is "warn"). */
export interface SaleWarning {
  code: typeof CREDIT_LIMIT_EXCEEDED;
  message: string;
  /** The buyer's balance after this save, e.g. "120000.00". */
  balance: string;
  creditLimit: string;
}

/** What create and edit return: the sale and the warnings of that save. */
export interface SaleWithWarnings extends Sale {
  warnings: SaleWarning[];
}

export interface SaleItemInput extends PurchaseItemInput {
  /** A lot of this shop, of the same commodity; null = not linked. */
  purchaseItemId?: string | null;
}

/** Body of `POST /sales`. */
export interface CreateSaleInput {
  buyerId: string;
  /** Default today (Asia/Karachi); never in the future. */
  saleDate?: string;
  items: SaleItemInput[];
  charges?: ManualChargesInput;
  /** Received on the same save; at most the net. Default "0". */
  receivedAmount?: string;
  notes?: string | null;
}

/** Body of `PATCH /sales/:id`; `items` replaces every item. */
export type UpdateSaleInput = Partial<CreateSaleInput>;

export const saleSortFields = ["saleDate", "billNo"] as const;
export type SaleSortField = (typeof saleSortFields)[number];

/** Query of `GET /sales` (from/to inclusive). */
export interface SaleListQuery {
  page: number;
  /** 1..100 */
  limit: number;
  /** Bill number, or the beopari's name or phone. */
  search?: string;
  from?: string;
  to?: string;
  buyer?: string;
  commodity?: string;
  status?: SaleStatus;
  sort?: SaleSortField | `-${SaleSortField}`;
}

/** What a create returns: the sale, its warnings, and whether it was a retry. */
export interface SavedSale {
  sale: SaleWithWarnings;
  /** 200: the same Idempotency-Key was already saved (a retry). */
  replayed: boolean;
}
