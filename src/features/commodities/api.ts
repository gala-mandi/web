import { api } from "@/lib/api";
import type { ListResponse } from "@/lib/list-query";
import type {
  Commodity,
  CommodityListQuery,
  CommodityLookupItem,
  CommodityLookupQuery,
  CreateCommodityInput,
  UpdateCommodityInput,
} from "./types";

const path = (id: string) => `/commodities/${encodeURIComponent(id)}`;

/** `GET /commodities`: one page, active and inactive. */
export async function listCommodities(
  query: CommodityListQuery,
  signal?: AbortSignal,
): Promise<ListResponse<Commodity>> {
  const { data } = await api.get<ListResponse<Commodity>>("/commodities", {
    params: query,
    signal,
  });
  return data;
}

/**
 * `GET /commodities/lookup`: active commodities only, names starting with
 * `q` first, each with the charges that apply.
 */
export async function lookupCommodities(
  query: CommodityLookupQuery,
  signal?: AbortSignal,
): Promise<CommodityLookupItem[]> {
  const params: Record<string, string | number> = { q: query.q };
  if (query.limit) params.limit = query.limit;
  const { data } = await api.get<{ data: CommodityLookupItem[] }>(
    "/commodities/lookup",
    { params, signal },
  );
  return data.data;
}

export async function createCommodity(
  input: CreateCommodityInput,
): Promise<Commodity> {
  const { data } = await api.post<Commodity>("/commodities", input);
  return data;
}

export async function updateCommodity(
  id: string,
  input: UpdateCommodityInput,
): Promise<Commodity> {
  const { data } = await api.patch<Commodity>(path(id), input);
  return data;
}

/** Soft delete; `409 COMMODITY_IN_USE` once rates, purchases or sales use it. */
export async function deleteCommodity(id: string): Promise<void> {
  await api.delete(path(id));
}
