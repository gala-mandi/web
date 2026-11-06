/** Shapes of the purchases API (see the purchases contract, server#34). */

import type {
  ChargeBasis,
  ChargeType,
  RateUnit,
} from "@/lib/charges/calculate-transaction";

export type { RateUnit };

/** `draft` exists in the enum but the server never creates one. */
export const purchaseStatuses = ["draft", "posted", "cancelled"] as const;
export type PurchaseStatus = (typeof purchaseStatuses)[number];

/** One row of `GET /purchases`. */
export interface PurchaseSummary {
  id: string;
  /** e.g. "PUR-2026-27-000123"; kept when cancelled, never reused. */
  billNo: string;
  /** Asia/Karachi date, e.g. "2026-11-06". */
  purchaseDate: string;
  /** The kissan selling the goods. */
  trader: { id: string; name: string };
  /** Rupees, e.g. "100000.00". */
  grossAmount: string;
  totalDeductions: string;
  /** net − (gross − deductions), e.g. "-0.46". */
  rounding: string;
  /** Credited to the kissan's khata, whole rupees. */
  netAmount: string;
  /** Paid on the same save (debited back in the khata). */
  paidAmount: string;
  status: PurchaseStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  commodityId: string;
  commodityName: string;
  bags: number | null;
  /** Kg, e.g. "1000.000". */
  weightKg: string;
  /** Rupees per `rateUnit`, as saved. */
  rate: string;
  rateUnit: RateUnit;
  amount: string;
}

export interface PurchaseCharge {
  id: string;
  type: ChargeType;
  basis: ChargeBasis;
  /** "2.00" (%), "20.00" (Rs per bag) or "150.00" (Rs), as saved. */
  value: string;
  amount: string;
}

/** `GET /purchases/:id` and what create, edit and cancel return. */
export interface Purchase extends PurchaseSummary {
  items: PurchaseItem[];
  charges: PurchaseCharge[];
  createdBy: string | null;
}

export interface PurchaseItemInput {
  commodityId: string;
  bags?: number | null;
  /** Kg, up to 3 decimals. */
  weightKg: string;
  rate: string;
  rateUnit: RateUnit;
}

/** Charges typed on the parchi; missing = the commodity's or shop's. */
export interface ManualChargesInput {
  commissionPct?: string | null;
  marketFeePct?: string | null;
  labourPerBag?: string | null;
}

/** Body of `POST /purchases`. */
export interface CreatePurchaseInput {
  traderId: string;
  /** Default today (Asia/Karachi); never in the future. */
  purchaseDate?: string;
  items: PurchaseItemInput[];
  charges?: ManualChargesInput;
  paidAmount?: string;
  notes?: string | null;
}

/** Body of `PATCH /purchases/:id`; `items` replaces every item. */
export type UpdatePurchaseInput = Partial<CreatePurchaseInput>;

export const purchaseSortFields = ["purchaseDate", "billNo"] as const;
export type PurchaseSortField = (typeof purchaseSortFields)[number];

/** Query of `GET /purchases` (from/to inclusive). */
export interface PurchaseListQuery {
  page: number;
  /** 1..100 */
  limit: number;
  /** Bill number, or the kissan's name or phone. */
  search?: string;
  from?: string;
  to?: string;
  trader?: string;
  commodity?: string;
  status?: PurchaseStatus;
  sort?: PurchaseSortField | `-${PurchaseSortField}`;
}

/** What a save returns: the purchase, and whether this key saved it before. */
export interface SavedPurchase {
  purchase: Purchase;
  /** 200: the same Idempotency-Key was already saved (a retry). */
  replayed: boolean;
}
