import Decimal from "decimal.js";
import { chanaItem, gandumItem, TODAY } from "@/features/purchases/test-data";
import type { CommodityLookupItem } from "@/features/commodities/types";
import { traderDetail } from "@/features/traders/test-data";
import type { TraderDetail } from "@/features/traders/types";
import { standardCharges } from "@/lib/charges/calculate-transaction";
import { calculateSale } from "@/lib/charges/sale-totals";
import type { ListResponse } from "@/lib/list-query";
import type {
  CreateSaleInput,
  SaleSummary,
  SaleWarning,
  SaleWithWarnings,
} from "./types";

/** Test data only. */
export { chanaItem, gandumItem, TODAY };

export const BEOPARI = {
  id: "99999999-9999-4999-8999-999999999999",
  type: "beopari" as const,
  name: "Shahid Traders",
  fatherName: null,
  phone: "03004445556",
  village: "Okara",
};

/** `GET /traders/:id` of the beopari: owes Rs 20,000, limit Rs 120,000. */
export function beopariDetail(
  overrides: Partial<TraderDetail> = {},
): TraderDetail {
  return traderDetail({
    ...BEOPARI,
    cnic: null,
    openingBalance: "0.00",
    creditLimit: "120000.00",
    balance: "20000.00",
    ...overrides,
  });
}

const charges: Record<string, CommodityLookupItem["charges"]> = {
  [gandumItem.id]: gandumItem.charges,
  [chanaItem.id]: chanaItem.charges,
};
const names: Record<string, string> = {
  [gandumItem.id]: gandumItem.name,
  [chanaItem.id]: chanaItem.name,
};

/** What the server would save for `input` (same calculator), as a sale. */
export function savedSale(
  input: CreateSaleInput,
  overrides: Partial<SaleWithWarnings> = {},
  warnings: SaleWarning[] = [],
): SaleWithWarnings {
  const totals = calculateSale(
    input.items.map((item) => ({
      ...item,
      charges: standardCharges(charges[item.commodityId]),
    })),
    "40",
  );
  return {
    id: "aaaaaaaa-5555-4555-8555-555555555555",
    billNo: "SAL-2026-27-000001",
    saleDate: input.saleDate ?? TODAY,
    buyer: { id: input.buyerId, name: BEOPARI.name },
    grossAmount: totals.grossAmount,
    totalCharges: totals.totalCharges,
    rounding: totals.rounding,
    netAmount: totals.netAmount,
    receivedAmount: input.receivedAmount ?? "0.00",
    outstanding: new Decimal(totals.netAmount)
      .minus(input.receivedAmount ?? "0")
      .toFixed(2),
    status: "posted",
    notes: input.notes ?? null,
    createdAt: "2026-11-06T05:00:00.000Z",
    updatedAt: "2026-11-06T05:00:00.000Z",
    createdBy: "u1",
    items: input.items.map((item, i) => ({
      id: `bbbbbbbb-6666-4666-8666-66666666666${i}`,
      commodityId: item.commodityId,
      commodityName: names[item.commodityId] ?? "Gandum",
      purchaseItemId: item.purchaseItemId ?? null,
      bags: item.bags ?? null,
      weightKg: item.weightKg,
      rate: item.rate,
      rateUnit: item.rateUnit,
      amount: totals.itemAmounts[i],
    })),
    charges: totals.charges.map((c, i) => ({
      id: `cccccccc-7777-4777-8777-77777777777${i}`,
      ...c,
    })),
    warnings,
    ...overrides,
  };
}

/** 10 bags, 25 maund (1,000 kg) of Gandum at Rs 4,000: net Rs 102,700. */
export const ticketSale: CreateSaleInput = {
  buyerId: BEOPARI.id,
  saleDate: TODAY,
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

export function saleList(rows: SaleSummary[]): ListResponse<SaleSummary> {
  return { data: rows, meta: { page: 1, limit: 20, total: rows.length } };
}
