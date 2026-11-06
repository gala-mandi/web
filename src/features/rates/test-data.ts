import { commodity } from "@/features/commodities/test-data";
import type { Commodity } from "@/features/commodities/types";
import type { ListResponse } from "@/lib/list-query";
import type { DayRates, Rate, TodayRates } from "./types";

/** Test data only. */
export const TODAY = "2026-11-06";
export const YESTERDAY = "2026-11-05";

export const gandum = commodity({ defaultUnit: "maund" });
export const kapas: Commodity = commodity({
  id: "22222222-2222-4222-8222-222222222222",
  name: "Kapas",
  nameUr: "کپاس",
  defaultUnit: "maund",
});
export const makai: Commodity = commodity({
  id: "33333333-3333-4333-8333-333333333333",
  name: "Makai",
  nameUr: "مکئی",
  defaultUnit: "kg",
});

export function rate(overrides: Partial<Rate> = {}): Rate {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    commodityId: gandum.id,
    rateDate: TODAY,
    minRate: "4000.00",
    maxRate: "4200.00",
    avgRate: null,
    rateUnit: "maund",
    createdAt: "2026-11-06T04:00:00.000Z",
    updatedAt: "2026-11-06T04:00:00.000Z",
    ...overrides,
  };
}

export function dayRates(date: string, data: Rate[] = []): DayRates {
  return { date, data };
}

export function todayRates(
  data: Rate[] = [],
  yesterday: Rate[] = [],
): TodayRates {
  return { date: TODAY, data, yesterday: dayRates(YESTERDAY, yesterday) };
}

export function rateList(rows: Rate[]): ListResponse<Rate> {
  return { data: rows, meta: { page: 1, limit: 100, total: rows.length } };
}
