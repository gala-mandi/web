import { useQueries, useQuery } from "@tanstack/react-query";
import { getTodayRates, listAllRates } from "@/features/rates/api";
import { rateKeys } from "@/features/rates/hooks";
import { retryUnlessClientError } from "@/features/traders/hooks";
import {
  countDayBills,
  getDailySummary,
  getOutstanding,
  getPurchasesReport,
  getSalesReport,
} from "./api";
import { OUTSTANDING_LIMIT, type TopCommodity, topCommodities } from "./series";
import type { BookReportQuery } from "./types";

/**
 * The dashboard refreshes itself every few minutes while it is open (the
 * reports note asks for no faster than that; the daily summary is cheap).
 */
export const DASHBOARD_REFRESH_MS = 3 * 60_000;

/** Shared by every dashboard query: refresh in the background, keep data. */
const live = {
  staleTime: 60_000,
  refetchInterval: DASHBOARD_REFRESH_MS,
  retry: retryUnlessClientError,
} as const;

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "daily-summary"] as const,
  book: (kind: "purchases" | "sales", query: BookReportQuery) =>
    [...dashboardKeys.all, "book", kind, query] as const,
  outstanding: (limit: number) =>
    [...dashboardKeys.all, "outstanding", limit] as const,
  topCommodities: (from: string, to: string) =>
    [...dashboardKeys.all, "top-commodities", from, to] as const,
  dayBills: (date: string) =>
    [...dashboardKeys.all, "day-bills", date] as const,
};

/** Today's KPIs: `GET /reports/daily-summary` (owner and manager). */
export function useDailySummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: ({ signal }) => getDailySummary({}, signal),
    ...live,
  });
}

/** Posted purchases per day from `from` to `to`. */
export function usePurchasesByDay(from: string, to: string) {
  const query: BookReportQuery = { from, to, groupBy: "day" };
  return useQuery({
    queryKey: dashboardKeys.book("purchases", query),
    queryFn: ({ signal }) => getPurchasesReport(query, signal),
    ...live,
  });
}

/** Posted sales per day from `from` to `to`. */
export function useSalesByDay(from: string, to: string) {
  const query: BookReportQuery = { from, to, groupBy: "day" };
  return useQuery({
    queryKey: dashboardKeys.book("sales", query),
    queryFn: ({ signal }) => getSalesReport(query, signal),
    ...live,
  });
}

/** The top receivables and payables; totals cover every trader. */
export function useOutstanding(limit: number = OUTSTANDING_LIMIT) {
  return useQuery({
    queryKey: dashboardKeys.outstanding(limit),
    queryFn: ({ signal }) => getOutstanding({ limit }, signal),
    ...live,
  });
}

/**
 * The shop's top commodities of the period: the most weight bought
 * (`/reports/purchases?groupBy=commodity`); a shop that only sold in the
 * period is ranked by its sales instead.
 */
export function useTopCommodities(from: string, to: string) {
  return useQuery({
    queryKey: dashboardKeys.topCommodities(from, to),
    queryFn: async ({ signal }): Promise<TopCommodity[]> => {
      const query: BookReportQuery = { from, to, groupBy: "commodity" };
      const bought = topCommodities(await getPurchasesReport(query, signal));
      if (bought.length > 0) return bought;
      return topCommodities(await getSalesReport(query, signal));
    },
    ...live,
  });
}

/**
 * Each commodity's rates from `from` to `to`, oldest first (`GET /rates`).
 * Same cache entries as the trend chart on the Daily rates page.
 */
export function useRateHistories(
  commodities: readonly TopCommodity[],
  from: string,
  to: string,
) {
  return useQueries({
    queries: commodities.map((c) => {
      const query = { commodity: c.id, from, to };
      return {
        queryKey: rateKeys.history(query),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listAllRates({ ...query, sort: "rateDate" }, signal),
        ...live,
      };
    }),
  });
}

/** For operators: how many purchases and sales were posted on `date`. */
export function useDayBills(date: string) {
  return useQuery({
    queryKey: dashboardKeys.dayBills(date),
    queryFn: ({ signal }) => countDayBills(date, signal),
    ...live,
  });
}

/** For operators: `GET /rates/today` (same cache as the Daily rates page). */
export function useLiveTodayRates() {
  return useQuery({
    queryKey: rateKeys.today(),
    queryFn: ({ signal }) => getTodayRates(signal),
    ...live,
  });
}
