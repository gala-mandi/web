import type { ListResponse } from "@/lib/list-query";
import type { Commodity, CommodityLookupItem, EffectiveCharges } from "./types";

/** Test data only. */
export function commodity(overrides: Partial<Commodity> = {}): Commodity {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Gandum",
    nameUr: "گندم",
    category: "grain",
    defaultUnit: "bag",
    bagWeightKg: "100.000",
    commissionPct: null,
    marketFeePct: null,
    labourPerBag: null,
    isActive: true,
    createdAt: "2026-10-27T10:30:00.000Z",
    updatedAt: "2026-10-27T10:30:00.000Z",
    ...overrides,
  };
}

export const kapas = commodity({
  id: "22222222-2222-4222-8222-222222222222",
  name: "Kapas",
  nameUr: "کپاس",
  category: "fibre",
  defaultUnit: "maund",
  bagWeightKg: null,
  commissionPct: "3.00",
  labourPerBag: "20.00",
  isActive: false,
});

/** The shop defaults the test settings carry. */
export const shopCharges: EffectiveCharges = {
  commissionPct: "2.50",
  marketFeePct: "0.00",
  labourPerBag: "15.00",
};

export function lookupItem(c: Commodity = commodity()): CommodityLookupItem {
  const { id, name, nameUr, defaultUnit, bagWeightKg } = c;
  return {
    id,
    name,
    nameUr,
    defaultUnit,
    bagWeightKg,
    charges: {
      commissionPct: c.commissionPct ?? shopCharges.commissionPct,
      marketFeePct: c.marketFeePct ?? shopCharges.marketFeePct,
      labourPerBag: c.labourPerBag ?? shopCharges.labourPerBag,
    },
  };
}

export function commodityList(
  rows: Commodity[],
  meta: Partial<ListResponse<Commodity>["meta"]> = {},
): ListResponse<Commodity> {
  return {
    data: rows,
    meta: { page: 1, limit: 20, total: rows.length, ...meta },
  };
}
