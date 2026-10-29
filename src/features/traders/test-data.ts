import type { ListResponse } from "@/lib/list-query";
import type { Trader, TraderDetail, TraderLookupItem } from "./types";

/** Test data only. */
export function trader(overrides: Partial<Trader> = {}): Trader {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    type: "kissan",
    name: "Muhammad Aslam",
    fatherName: "Muhammad Akram",
    phone: "03001234567",
    cnic: "35202-1234567-1",
    village: "Chak 45",
    address: null,
    openingBalance: "50000.00",
    openingBalanceType: "debit",
    creditLimit: null,
    isActive: true,
    notes: null,
    createdAt: "2026-10-27T10:30:00.000Z",
    updatedAt: "2026-10-27T10:30:00.000Z",
    ...overrides,
  };
}

export function traderDetail(
  overrides: Partial<TraderDetail> = {},
): TraderDetail {
  return { ...trader(), balance: "50000.00", ...overrides };
}

export const urduTrader = trader({
  id: "22222222-2222-4222-8222-222222222222",
  name: "محمد اسلم",
  fatherName: "محمد اکرم",
  type: "beopari",
  phone: null,
  village: "اوکاڑہ",
  openingBalance: "0.00",
  isActive: false,
});

export function lookupItem(t: Trader = trader()): TraderLookupItem {
  const { id, type, name, fatherName, phone, village } = t;
  return { id, type, name, fatherName, phone, village };
}

export function traderList(
  rows: Trader[],
  meta: Partial<ListResponse<Trader>["meta"]> = {},
): ListResponse<Trader> {
  return {
    data: rows,
    meta: { page: 1, limit: 20, total: rows.length, ...meta },
  };
}
