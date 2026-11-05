/** Shapes of the commodities API (see the commodities contract, server#22). */

import type { WeightUnit } from "@/features/settings/types";

export type { WeightUnit };

export interface Commodity {
  id: string;
  /** 2..80 characters, unique in the shop, e.g. "Gandum". */
  name: string;
  /** Urdu name, e.g. "گندم". */
  nameUr: string | null;
  /** Free text up to 40 characters, e.g. "grain". */
  category: string | null;
  defaultUnit: WeightUnit;
  /** Kg per bag, e.g. "100.000"; null = set on each purchase. */
  bagWeightKg: string | null;
  /** Overrides of the shop's charges; null = the shop default applies. */
  commissionPct: string | null;
  marketFeePct: string | null;
  /** Rupees per bag, e.g. "12.00". */
  labourPerBag: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The charges that apply: the commodity's override, else the shop default. */
export interface EffectiveCharges {
  /** e.g. "2.50" */
  commissionPct: string;
  marketFeePct: string;
  /** Rupees, e.g. "15.00" */
  labourPerBag: string;
}

/** What `GET /commodities/lookup` returns per commodity (active only). */
export type CommodityLookupItem = Pick<
  Commodity,
  "id" | "name" | "nameUr" | "defaultUnit" | "bagWeightKg"
> & { charges: EffectiveCharges };

/** The charge overrides of a commodity. */
export const chargeFields = [
  "commissionPct",
  "marketFeePct",
  "labourPerBag",
] as const;
export type ChargeField = (typeof chargeFields)[number];

export interface CreateCommodityInput {
  name: string;
  nameUr?: string | null;
  category?: string | null;
  /** Default "maund". */
  defaultUnit?: WeightUnit;
  bagWeightKg?: string | null;
  /** null or "" = no override (the shop default applies). */
  commissionPct?: string | null;
  marketFeePct?: string | null;
  labourPerBag?: string | null;
  /** Default true. */
  isActive?: boolean;
}

/** Any subset of the create fields; deactivate = `{ isActive: false }`. */
export type UpdateCommodityInput = Partial<CreateCommodityInput>;

export const commoditySortFields = ["name", "createdAt"] as const;
export type CommoditySortField = (typeof commoditySortFields)[number];

/** Query of `GET /commodities`. */
export interface CommodityListQuery {
  page: number;
  limit: number;
  /** English or Urdu name. */
  search?: string;
  /** Exact category, any case. */
  category?: string;
  active?: boolean;
  sort?: CommoditySortField | `-${CommoditySortField}`;
}

/** Query of `GET /commodities/lookup`. */
export interface CommodityLookupQuery {
  q: string;
  limit?: number;
}
