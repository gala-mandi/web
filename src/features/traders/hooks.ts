import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toApiError } from "@/lib/api-error";
import {
  createTrader,
  deleteTrader,
  getTrader,
  listTraders,
  lookupTraders,
  updateTrader,
} from "./api";
import type {
  CreateTraderInput,
  TraderDetail,
  TraderListQuery,
  TraderLookupQuery,
  UpdateTraderInput,
} from "./types";

export const traderKeys = {
  all: ["traders"] as const,
  lists: () => [...traderKeys.all, "list"] as const,
  list: (query: TraderListQuery) => [...traderKeys.lists(), query] as const,
  lookups: () => [...traderKeys.all, "lookup"] as const,
  lookup: (query: TraderLookupQuery) =>
    [...traderKeys.lookups(), query] as const,
  details: () => [...traderKeys.all, "detail"] as const,
  detail: (id: string) => [...traderKeys.details(), id] as const,
};

/** 400 (bad id), 403 and 404 won't change on a retry. */
export function retryUnlessClientError(failureCount: number, error: unknown) {
  const { status } = toApiError(error);
  if (status === 400 || status === 403 || status === 404) return false;
  return failureCount < 1;
}

/** `GET /traders`; the previous page stays on screen while the next loads. */
export function useTraders(query: TraderListQuery) {
  return useQuery({
    queryKey: traderKeys.list(query),
    queryFn: ({ signal }) => listTraders(query, signal),
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });
}

/** `GET /traders/lookup` for the trader picker (active traders only). */
export function useTraderLookup(query: TraderLookupQuery, enabled = true) {
  return useQuery({
    queryKey: traderKeys.lookup(query),
    queryFn: ({ signal }) => lookupTraders(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: retryUnlessClientError,
    enabled,
  });
}

/** `GET /traders/:id` with the balance. */
export function useTrader(id: string) {
  return useQuery({
    queryKey: traderKeys.detail(id),
    queryFn: ({ signal }) => getTrader(id, signal),
    retry: retryUnlessClientError,
  });
}

/** Lists and picker results go stale after any change. */
function useInvalidateLists() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: traderKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: traderKeys.lookups() }),
    ]);
}

/** `POST /traders`. */
export function useCreateTrader() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (input: CreateTraderInput) => createTrader(input),
    onSuccess: () => void invalidate(),
  });
}

/** `PATCH /traders/:id` (edit, deactivate, activate). */
export function useUpdateTrader() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTraderInput }) =>
      updateTrader(id, input),
    onSuccess: (trader: TraderDetail) => {
      queryClient.setQueryData(traderKeys.detail(trader.id), trader);
      void invalidate();
    },
  });
}

/** `DELETE /traders/:id`. */
export function useDeleteTrader() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (id: string) => deleteTrader(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: traderKeys.detail(id) });
      void invalidate();
    },
  });
}
