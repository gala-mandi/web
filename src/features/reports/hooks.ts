import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getCashBookReport,
  getCommissionReport,
  getDailySummary,
  getOutstanding,
  getPurchasesReport,
  getSalesReport,
} from "@/features/dashboard/api";
import type {
  BookReportQuery,
  OutstandingQuery,
  PurchasesReport,
  ReportRange,
  SalesReport,
} from "@/features/dashboard/types";
import { getTrader } from "@/features/traders/api";
import { retryUnlessClientError, traderKeys } from "@/features/traders/hooks";

/**
 * Report queries (`GET /reports/*`, owner and manager). The previous
 * report stays on screen, dimmed, while another range loads.
 */
const options = {
  staleTime: 60_000,
  placeholderData: keepPreviousData,
  retry: retryUnlessClientError,
} as const;

export const reportKeys = {
  all: ["reports"] as const,
  dailySummary: (date: string) =>
    [...reportKeys.all, "daily-summary", date] as const,
  book: (kind: "purchases" | "sales", query: BookReportQuery) =>
    [...reportKeys.all, kind, query] as const,
  commission: (range: ReportRange) =>
    [...reportKeys.all, "commission", range] as const,
  outstanding: (query: OutstandingQuery) =>
    [...reportKeys.all, "outstanding", query] as const,
  cashBook: (range: ReportRange) =>
    [...reportKeys.all, "cash-book", range] as const,
};

export function useDailySummaryReport(date: string) {
  return useQuery({
    queryKey: reportKeys.dailySummary(date),
    queryFn: ({ signal }) => getDailySummary({ date }, signal),
    ...options,
  });
}

/** The purchases or the sales report. */
export function useBookReport(
  kind: "purchases" | "sales",
  query: BookReportQuery,
) {
  return useQuery({
    queryKey: reportKeys.book(kind, query),
    queryFn: ({ signal }): Promise<PurchasesReport | SalesReport> =>
      kind === "purchases"
        ? getPurchasesReport(query, signal)
        : getSalesReport(query, signal),
    ...options,
  });
}

/**
 * The trader picked in a report's filter, for its name after a reload
 * (`GET /traders/:id`, the same cache as the trader's profile).
 */
export function useFilterTrader(id: string | null) {
  return useQuery({
    queryKey: traderKeys.detail(id ?? ""),
    queryFn: ({ signal }) => getTrader(id ?? "", signal),
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

export function useCommissionReport(range: ReportRange) {
  return useQuery({
    queryKey: reportKeys.commission(range),
    queryFn: ({ signal }) => getCommissionReport(range, signal),
    ...options,
  });
}

export function useOutstandingReport(query: OutstandingQuery) {
  return useQuery({
    queryKey: reportKeys.outstanding(query),
    queryFn: ({ signal }) => getOutstanding(query, signal),
    ...options,
  });
}

export function useCashBookReport(range: ReportRange) {
  return useQuery({
    queryKey: reportKeys.cashBook(range),
    queryFn: ({ signal }) => getCashBookReport(range, signal),
    ...options,
  });
}
