import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCommodities } from "@/features/commodities/api";
import { commodityKeys } from "@/features/commodities/hooks";
import type { Commodity } from "@/features/commodities/types";
import { retryUnlessClientError } from "@/features/traders/hooks";
import { getDayRates, getTodayRates, listAllRates, saveRates } from "./api";
import type { DayRates, SaveRatesInput, TodayRates } from "./types";
import { addDays } from "./values";

export interface RateHistoryQuery {
  commodity: string;
  from: string;
  to: string;
}

export const rateKeys = {
  all: ["rates"] as const,
  today: () => [...rateKeys.all, "today"] as const,
  days: () => [...rateKeys.all, "day"] as const,
  day: (date: string) => [...rateKeys.days(), date] as const,
  histories: () => [...rateKeys.all, "history"] as const,
  history: (query: RateHistoryQuery) =>
    [...rateKeys.histories(), query] as const,
};

/** Most commodities `GET /commodities` returns per page. */
const COMMODITIES_PAGE_LIMIT = 100;

/** Every commodity of the shop (active and inactive), page by page. */
async function listEveryCommodity(signal?: AbortSignal): Promise<Commodity[]> {
  const rows: Commodity[] = [];
  for (let page = 1; ; page += 1) {
    const result = await listCommodities(
      { page, limit: COMMODITIES_PAGE_LIMIT, sort: "name" },
      signal,
    );
    rows.push(...result.data);
    if (result.data.length === 0 || rows.length >= result.meta.total) {
      return rows;
    }
  }
}

/**
 * The grid's commodities. Kept under the commodity lists key, so adding or
 * editing a commodity refreshes the grid too.
 */
export function useEveryCommodity() {
  return useQuery({
    queryKey: [...commodityKeys.lists(), "every"] as const,
    queryFn: ({ signal }) => listEveryCommodity(signal),
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
}

/** `GET /rates/today`: today's date (Asia/Karachi), its rates and yesterday's. */
export function useTodayRates(enabled = true) {
  return useQuery({
    queryKey: rateKeys.today(),
    queryFn: ({ signal }) => getTodayRates(signal),
    staleTime: 30_000,
    retry: retryUnlessClientError,
    enabled,
  });
}

/** A past day's rates and the day before's (for "Copy yesterday"). */
export function usePastDayRates(date: string | null) {
  return useQuery({
    queryKey: rateKeys.day(date ?? ""),
    queryFn: async ({ signal }): Promise<TodayRates> => {
      const day = date as string;
      const [current, yesterday] = await Promise.all([
        getDayRates(day, signal),
        getDayRates(addDays(day, -1), signal),
      ]);
      return { ...current, yesterday };
    },
    staleTime: 30_000,
    retry: retryUnlessClientError,
    enabled: Boolean(date),
  });
}

/** One commodity's rates from `from` to `to`, oldest first, for the chart. */
export function useRateHistory(query: RateHistoryQuery | null) {
  return useQuery({
    queryKey: rateKeys.history(query ?? { commodity: "", from: "", to: "" }),
    queryFn: ({ signal }) =>
      listAllRates(
        { ...(query as RateHistoryQuery), sort: "rateDate" },
        signal,
      ),
    staleTime: 60_000,
    retry: retryUnlessClientError,
    enabled: Boolean(query),
  });
}

/**
 * `PUT /rates/:date`. The saved day's cache gets the server's answer at once
 * (the grid never blanks); other days and the chart refresh in the background.
 */
export function useSaveRates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, input }: { date: string; input: SaveRatesInput }) =>
      saveRates(date, input),
    onSuccess: (saved: DayRates) => {
      const today = queryClient.getQueryData<TodayRates>(rateKeys.today());
      const key =
        today?.date === saved.date
          ? rateKeys.today()
          : rateKeys.day(saved.date);
      queryClient.setQueryData<TodayRates>(key, (old) =>
        old ? { ...old, data: saved.data } : old,
      );
      void queryClient.invalidateQueries({
        queryKey: rateKeys.all,
        predicate: (query) =>
          JSON.stringify(query.queryKey) !== JSON.stringify(key),
      });
    },
  });
}
