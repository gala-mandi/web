import { commodity, lookupItem } from "@/features/commodities/test-data";
import type { CommodityLookupItem } from "@/features/commodities/types";
import { calculatePurchase } from "@/lib/charges/purchase-totals";
import { standardCharges } from "@/lib/charges/calculate-transaction";
import type { ListResponse } from "@/lib/list-query";
import type { CreatePurchaseInput, Purchase, PurchaseSummary } from "./types";

/** Test data only. */
export const TODAY = "2026-11-06";

/** Gandum: 2% commission, 0.5% market fee, Rs 20 a bag (the ticket 19 example). */
export const gandumItem: CommodityLookupItem = {
  ...lookupItem(commodity({ defaultUnit: "maund", bagWeightKg: null })),
  charges: {
    commissionPct: "2.00",
    marketFeePct: "0.50",
    labourPerBag: "20.00",
  },
};

/** Chana: shop defaults 2.5%, 0%, Rs 15 a bag. */
export const chanaItem: CommodityLookupItem = lookupItem(
  commodity({
    id: "33333333-3333-4333-8333-333333333333",
    name: "Chana",
    nameUr: "چنا",
    defaultUnit: "maund",
    bagWeightKg: null,
  }),
);

export const KISSAN = {
  id: "44444444-4444-4444-8444-444444444444",
  type: "kissan" as const,
  name: "Rafiq Ahmad",
  fatherName: null,
  phone: "03001112223",
  village: "Chak 12",
};

const charges: Record<string, CommodityLookupItem["charges"]> = {
  [gandumItem.id]: gandumItem.charges,
  [chanaItem.id]: chanaItem.charges,
};
const names: Record<string, string> = {
  [gandumItem.id]: gandumItem.name,
  [chanaItem.id]: chanaItem.name,
};

/** What the server would save for `input` (same calculator), as `Purchase`. */
export function savedPurchase(
  input: CreatePurchaseInput,
  overrides: Partial<Purchase> = {},
): Purchase {
  const totals = calculatePurchase(
    input.items.map((item) => ({
      ...item,
      charges: standardCharges(charges[item.commodityId]),
    })),
    "40",
  );
  return {
    id: "55555555-5555-4555-8555-555555555555",
    billNo: "PUR-2026-27-000001",
    purchaseDate: input.purchaseDate ?? TODAY,
    trader: { id: input.traderId, name: KISSAN.name },
    grossAmount: totals.grossAmount,
    totalDeductions: totals.totalDeductions,
    rounding: totals.rounding,
    netAmount: totals.netAmount,
    paidAmount: "0.00",
    outstanding: totals.netAmount,
    status: "posted",
    notes: input.notes ?? null,
    createdAt: "2026-11-06T05:00:00.000Z",
    updatedAt: "2026-11-06T05:00:00.000Z",
    createdBy: "u1",
    items: input.items.map((item, i) => ({
      id: `66666666-6666-4666-8666-66666666666${i}`,
      commodityId: item.commodityId,
      commodityName: names[item.commodityId] ?? "Gandum",
      bags: item.bags ?? null,
      weightKg: item.weightKg,
      rate: item.rate,
      rateUnit: item.rateUnit,
      amount: totals.itemAmounts[i],
    })),
    charges: totals.charges.map((c, i) => ({
      id: `77777777-7777-4777-8777-77777777777${i}`,
      ...c,
    })),
    ...overrides,
  };
}

/** The ticket example: 10 bags, 25 maund (1,000 kg) of Gandum at Rs 4,000. */
export const ticketInput: CreatePurchaseInput = {
  traderId: KISSAN.id,
  purchaseDate: TODAY,
  items: [
    {
      commodityId: gandumItem.id,
      bags: 10,
      weightKg: "1000.000",
      rate: "4000",
      rateUnit: "maund",
    },
  ],
  notes: null,
};

export function purchaseList(
  rows: PurchaseSummary[],
): ListResponse<PurchaseSummary> {
  return { data: rows, meta: { page: 1, limit: 20, total: rows.length } };
}
