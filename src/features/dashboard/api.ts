import { listPurchases } from "@/features/purchases/api";
import { listSales } from "@/features/sales/api";
import { api } from "@/lib/api";
import type {
  BookReport,
  BookReportQuery,
  DailySummary,
  OutstandingReport,
} from "./types";

/** `GET /reports/daily-summary`: today (Asia/Karachi) on the server's clock. */
export async function getDailySummary(
  signal?: AbortSignal,
): Promise<DailySummary> {
  const { data } = await api.get<DailySummary>("/reports/daily-summary", {
    signal,
  });
  return data;
}

/** `GET /reports/purchases` grouped by day, commodity or trader. */
export async function getPurchasesReport(
  query: BookReportQuery,
  signal?: AbortSignal,
): Promise<BookReport> {
  const { data } = await api.get<BookReport>("/reports/purchases", {
    params: query,
    signal,
  });
  return data;
}

/** `GET /reports/sales` grouped by day, commodity or trader. */
export async function getSalesReport(
  query: BookReportQuery,
  signal?: AbortSignal,
): Promise<BookReport> {
  const { data } = await api.get<BookReport>("/reports/sales", {
    params: query,
    signal,
  });
  return data;
}

/** `GET /reports/outstanding?limit=`: the largest balances on each side. */
export async function getOutstanding(
  limit: number,
  signal?: AbortSignal,
): Promise<OutstandingReport> {
  const { data } = await api.get<OutstandingReport>("/reports/outstanding", {
    params: { limit },
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
