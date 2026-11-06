import { listPurchases } from "@/features/purchases/api";
import { listSales } from "@/features/sales/api";
import { api } from "@/lib/api";
import type { CashBook } from "@/features/payments/types";
import type {
  BookReportQuery,
  CommissionReport,
  DailySummary,
  OutstandingQuery,
  OutstandingReport,
  PurchasesReport,
  ReportRange,
  SalesReport,
} from "./types";

/**
 * `GET /reports/daily-summary?date=`: one day; without a date, today
 * (Asia/Karachi) on the server's clock.
 */
export async function getDailySummary(
  query: { date?: string } = {},
  signal?: AbortSignal,
): Promise<DailySummary> {
  const { data } = await api.get<DailySummary>("/reports/daily-summary", {
    params: query,
    signal,
  });
  return data;
}

/** `GET /reports/purchases` grouped by day, commodity or trader. */
export async function getPurchasesReport(
  query: BookReportQuery,
  signal?: AbortSignal,
): Promise<PurchasesReport> {
  const { data } = await api.get<PurchasesReport>("/reports/purchases", {
    params: query,
    signal,
  });
  return data;
}

/** `GET /reports/sales` grouped by day, commodity or trader. */
export async function getSalesReport(
  query: BookReportQuery,
  signal?: AbortSignal,
): Promise<SalesReport> {
  const { data } = await api.get<SalesReport>("/reports/sales", {
    params: query,
    signal,
  });
  return data;
}

/**
 * `GET /reports/outstanding`: receivable and payable khata balances,
 * largest first (the `limit` largest of each side; every trader without).
 */
export async function getOutstanding(
  query: OutstandingQuery,
  signal?: AbortSignal,
): Promise<OutstandingReport> {
  const { data } = await api.get<OutstandingReport>("/reports/outstanding", {
    params: query,
    signal,
  });
  return data;
}

/** `GET /reports/commission?from=&to=`: commission per day and in total. */
export async function getCommissionReport(
  range: ReportRange,
  signal?: AbortSignal,
): Promise<CommissionReport> {
  const { data } = await api.get<CommissionReport>("/reports/commission", {
    params: range,
    signal,
  });
  return data;
}

/**
 * `GET /reports/cash-book?from=&to=`: the cash book of
 * `GET /payments/cash-book`, for `report.view`.
 */
export async function getCashBookReport(
  range: ReportRange,
  signal?: AbortSignal,
): Promise<CashBook> {
  const { data } = await api.get<CashBook>("/reports/cash-book", {
    params: range,
    signal,
  });
  return data;
}

/**
 * How many posted purchases and sales a day has, for staff without
 * `report.view`: the lists' `meta.total` with one row per page. Counts only;
 * no amounts are added up in the browser.
 */
export async function countDayBills(
  date: string,
  signal?: AbortSignal,
): Promise<{ purchases: number; sales: number }> {
  const query = {
    page: 1,
    limit: 1,
    from: date,
    to: date,
    status: "posted",
  } as const;
  const [purchases, sales] = await Promise.all([
    listPurchases(query, signal),
    listSales(query, signal),
  ]);
  return { purchases: purchases.meta.total, sales: sales.meta.total };
}
