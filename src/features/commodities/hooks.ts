import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getSettings } from "@/features/settings/api";
import { settingsKeys } from "@/features/settings/hooks";
import { retryUnlessClientError } from "@/features/traders/hooks";
import { useCan } from "@/lib/can";
import {
  createCommodity,
  deleteCommodity,
  listCommodities,
  lookupCommodities,
  updateCommodity,
} from "./api";
import type {
  CommodityListQuery,
  CommodityLookupQuery,
  CreateCommodityInput,
  EffectiveCharges,
  UpdateCommodityInput,
} from "./types";

export const commodityKeys = {
  all: ["commodities"] as const,
  lists: () => [...commodityKeys.all, "list"] as const,
  list: (query: CommodityListQuery) =>
    [...commodityKeys.lists(), query] as const,
  lookups: () => [...commodityKeys.all, "lookup"] as const,
  lookup: (query: CommodityLookupQuery) =>
    [...commodityKeys.lookups(), query] as const,
};

/** `GET /commodities`; the previous page stays on screen while the next loads. */
export function useCommodities(query: CommodityListQuery) {
  return useQuery({
    queryKey: commodityKeys.list(query),
    queryFn: ({ signal }) => listCommodities(query, signal),
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });
}

/** `GET /commodities/lookup` for the commodity picker (active only). */
export function useCommodityLookup(
  query: CommodityLookupQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: commodityKeys.lookup(query),
    queryFn: ({ signal }) => lookupCommodities(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: retryUnlessClientError,
    enabled,
  });
}

/**
 * The shop's default charges (from `GET /settings`, shared with the Settings
 * page's cache), shown next to each override. Settings need
 * `settings.manage`, so a manager gets `undefined` and no request is made.
 */
export function useShopCharges(enabled = true): EffectiveCharges | undefined {
  const allowed = useCan("settings.manage");
  const query = useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: ({ signal }) => getSettings(signal),
    retry: retryUnlessClientError,
    staleTime: 60_000,
    enabled: enabled && allowed,
  });
  const settings = query.data;
  return settings
    ? {
        commissionPct: settings.defaultCommissionPct,
        marketFeePct: settings.marketFeePct,
        labourPerBag: settings.labourPerBag,
      }
    : undefined;
}

/** Lists and picker results go stale after any change. */
function useInvalidateLists() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: commodityKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: commodityKeys.lookups() }),
    ]);
}

/** `POST /commodities`. */
export function useCreateCommodity() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (input: CreateCommodityInput) => createCommodity(input),
    onSuccess: () => void invalidate(),
  });
}

/** `PATCH /commodities/:id` (edit, deactivate, activate). */
export function useUpdateCommodity() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCommodityInput }) =>
      updateCommodity(id, input),
    onSuccess: () => void invalidate(),
  });
}

/** `DELETE /commodities/:id`. */
export function useDeleteCommodity() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (id: string) => deleteCommodity(id),
    onSuccess: () => void invalidate(),
  });
}
