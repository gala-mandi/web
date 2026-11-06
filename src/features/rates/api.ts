import { api } from "@/lib/api";
import type { ListResponse } from "@/lib/list-query";
import type {
  DayRates,
  Rate,
  RateListQuery,
  SaveRatesInput,
  TodayRates,
} from "./types";

/** Most rows `GET /rates` returns per page. */
export const RATES_PAGE_LIMIT = 100;

/** `GET /rates/today`: today's rates (Asia/Karachi date) and yesterday's. */
export async function getTodayRates(signal?: AbortSignal): Promise<TodayRates> {
  const { data } = await api.get<TodayRates>("/rates/today", { signal });
  return data;
}

/** `GET /rates`: one page of the rate history. */
export async function listRates(
  query: RateListQuery,
  signal?: AbortSignal,
): Promise<ListResponse<Rate>> {
  const { data } = await api.get<ListResponse<Rate>>("/rates", {
    params: query,
    signal,
  });
  return data;
}

/** Every rate of a query, page by page (a shop has a few dozen per day). */
export async function listAllRates(
  query: Omit<RateListQuery, "page" | "limit">,
  signal?: AbortSignal,
): Promise<Rate[]> {
  const rows: Rate[] = [];
  for (let page = 1; ; page += 1) {
    const result = await listRates(
      { ...query, page, limit: RATES_PAGE_LIMIT },
      signal,
    );
    rows.push(...result.data);
    if (result.data.length === 0 || rows.length >= result.meta.total) {
      return rows;
    }
  }
}

/** One day's rates through `GET /rates?from=date&to=date`. */
export async function getDayRates(
  date: string,
  signal?: AbortSignal,
): Promise<DayRates> {
  const data = await listAllRates({ from: date, to: date }, signal);
  return { date, data };
}

/**
 * `PUT /rates/:date`: adds or updates the listed commodities' rates for the
 * day; returns all of that day's rates.
 */
export async function saveRates(
  date: string,
  input: SaveRatesInput,
): Promise<DayRates> {
  const { data } = await api.put<DayRates>(
    `/rates/${encodeURIComponent(date)}`,
    input,
  );
  return data;
}
