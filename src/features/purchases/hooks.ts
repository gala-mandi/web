import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { retryUnlessClientError, traderKeys } from "@/features/traders/hooks";
import {
  cancelPurchase,
  createPurchase,
  getPurchase,
  listPurchases,
  updatePurchase,
} from "./api";
import type {
  CreatePurchaseInput,
  Purchase,
  PurchaseListQuery,
  UpdatePurchaseInput,
} from "./types";

export const purchaseKeys = {
  all: ["purchases"] as const,
  lists: () => [...purchaseKeys.all, "list"] as const,
  list: (query: PurchaseListQuery) => [...purchaseKeys.lists(), query] as const,
  details: () => [...purchaseKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseKeys.details(), id] as const,
};

/** `GET /purchases`; the previous page stays on screen while the next loads. */
export function usePurchases(query: PurchaseListQuery) {
  return useQuery({
    queryKey: purchaseKeys.list(query),
    queryFn: ({ signal }) => listPurchases(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

/** `GET /purchases/:id`. */
export function usePurchase(id: string) {
  return useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn: ({ signal }) => getPurchase(id, signal),
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
}

/**
 * A saved purchase goes into the detail cache at once (the view opens without
 * a request); lists and the kissan's balance (khata) refresh in the background.
 */
function storeSaved(
  queryClient: QueryClient,
  purchase: Purchase,
  oldTraderId?: string,
) {
  queryClient.setQueryData(purchaseKeys.detail(purchase.id), purchase);
  void queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
  for (const id of new Set([purchase.trader.id, oldTraderId])) {
    if (id)
      void queryClient.invalidateQueries({ queryKey: traderKeys.detail(id) });
  }
}

/** `POST /purchases` with the form's Idempotency-Key. */
export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: CreatePurchaseInput;
      idempotencyKey: string;
    }) => createPurchase(input, idempotencyKey),
    onSuccess: ({ purchase }) => storeSaved(queryClient, purchase),
  });
}

/** `PATCH /purchases/:id`. */
export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdatePurchaseInput;
      /** The kissan before the edit, whose balance also changes. */
      oldTraderId?: string;
    }) => updatePurchase(id, input),
    onSuccess: (purchase, { oldTraderId }) =>
      storeSaved(queryClient, purchase, oldTraderId),
  });
}

/** `POST /purchases/:id/cancel` (owner only). */
export function useCancelPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPurchase(id),
    onSuccess: (purchase) => storeSaved(queryClient, purchase),
  });
}
