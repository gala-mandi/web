import { api } from "@/lib/api";
import type { ListResponse } from "@/lib/list-query";
import type {
  CreateTraderInput,
  Trader,
  TraderDetail,
  TraderListQuery,
  TraderLookupItem,
  TraderLookupQuery,
  UpdateTraderInput,
} from "./types";

const path = (id: string) => `/traders/${encodeURIComponent(id)}`;

/** `GET /traders`: one page, active and inactive. */
export async function listTraders(
  query: TraderListQuery,
  signal?: AbortSignal,
): Promise<ListResponse<Trader>> {
  const { data } = await api.get<ListResponse<Trader>>("/traders", {
    params: query,
    signal,
  });
  return data;
}

/** `GET /traders/lookup`: active traders only, names starting with `q` first. */
export async function lookupTraders(
  query: TraderLookupQuery,
  signal?: AbortSignal,
): Promise<TraderLookupItem[]> {
  const params: Record<string, string | number> = { q: query.q };
  if (query.type) params.type = query.type;
  if (query.limit) params.limit = query.limit;
  const { data } = await api.get<{ data: TraderLookupItem[] }>(
    "/traders/lookup",
    { params, signal },
  );
  return data.data;
}

/** `GET /traders/:id` with the current khata balance. */
export async function getTrader(
  id: string,
  signal?: AbortSignal,
): Promise<TraderDetail> {
  const { data } = await api.get<TraderDetail>(path(id), { signal });
  return data;
}

export async function createTrader(input: CreateTraderInput): Promise<Trader> {
  const { data } = await api.post<Trader>("/traders", input);
  return data;
}

export async function updateTrader(
  id: string,
  input: UpdateTraderInput,
): Promise<TraderDetail> {
  const { data } = await api.patch<TraderDetail>(path(id), input);
  return data;
}

/** Soft delete; `409 TRADER_HAS_TRANSACTIONS` when the trader has entries. */
export async function deleteTrader(id: string): Promise<void> {
  await api.delete(path(id));
}
