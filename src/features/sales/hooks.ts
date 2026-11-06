import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { retryUnlessClientError, traderKeys } from "@/features/traders/hooks";
import { cancelSale, createSale, getSale, listSales, updateSale } from "./api";
import type {
  CreateSaleInput,
  Sale,
  SaleListQuery,
  UpdateSaleInput,
} from "./types";

export const saleKeys = {
  all: ["sales"] as const,
  lists: () => [...saleKeys.all, "list"] as const,
  list: (query: SaleListQuery) => [...saleKeys.lists(), query] as const,
  details: () => [...saleKeys.all, "detail"] as const,
  detail: (id: string) => [...saleKeys.details(), id] as const,
};

/** `GET /sales`; the previous page stays on screen while the next loads. */
export function useSales(query: SaleListQuery) {
  return useQuery({
    queryKey: saleKeys.list(query),
    queryFn: ({ signal }) => listSales(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

/** `GET /sales/:id`. */
export function useSale(id: string) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: ({ signal }) => getSale(id, signal),
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

/**
 * A saved sale goes into the detail cache at once (the view opens without a
 * request, `warnings` left out); lists and the beopari's balance (khata)
 * refresh in the background.
 */
function storeSaved(queryClient: QueryClient, sale: Sale, oldBuyerId?: string) {
  const detail: Sale & { warnings?: unknown } = { ...sale };
  delete detail.warnings;
  queryClient.setQueryData(saleKeys.detail(sale.id), detail);
  void queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
  for (const id of new Set([sale.buyer.id, oldBuyerId])) {
    if (id)
      void queryClient.invalidateQueries({ queryKey: traderKeys.detail(id) });
  }
}

/** `POST /sales` with the form's Idempotency-Key. */
export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: CreateSaleInput;
      idempotencyKey: string;
    }) => createSale(input, idempotencyKey),
    onSuccess: ({ sale }) => storeSaved(queryClient, sale),
  });
}

/** `PATCH /sales/:id` (owner, manager). */
export function useUpdateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateSaleInput;
      /** The beopari before the edit, whose balance also changes. */
      oldBuyerId?: string;
    }) => updateSale(id, input),
    onSuccess: (sale, { oldBuyerId }) =>
      storeSaved(queryClient, sale, oldBuyerId),
  });
}

/** `POST /sales/:id/cancel` (owner only). */
export function useCancelSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelSale(id),
    onSuccess: (sale) => storeSaved(queryClient, sale),
  });
}
