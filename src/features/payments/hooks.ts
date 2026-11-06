import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ledgerKeys } from "@/features/ledger/hooks";
import { listPurchases } from "@/features/purchases/api";
import { purchaseKeys } from "@/features/purchases/hooks";
import type {
  PurchaseListQuery,
  PurchaseSummary,
} from "@/features/purchases/types";
import { listSales } from "@/features/sales/api";
import { saleKeys } from "@/features/sales/hooks";
import type { SaleListQuery, SaleSummary } from "@/features/sales/types";
import { retryUnlessClientError, traderKeys } from "@/features/traders/hooks";
import type { ListResponse } from "@/lib/list-query";
import { type OutstandingBill, oldestFirst } from "./allocation";
import {
  cancelPayment,
  createPayment,
  getCashBook,
  getPayment,
  listPayments,
} from "./api";
import type {
  CashBookQuery,
  CreatePaymentInput,
  Payment,
  PaymentDirection,
  PaymentListQuery,
} from "./types";

const STALE_TIME = 30_000;

export const paymentKeys = {
  all: ["payments"] as const,
  lists: () => [...paymentKeys.all, "list"] as const,
  list: (query: PaymentListQuery) => [...paymentKeys.lists(), query] as const,
  details: () => [...paymentKeys.all, "detail"] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  cashBooks: () => [...paymentKeys.all, "cash-book"] as const,
  cashBook: (query: CashBookQuery) =>
    [...paymentKeys.cashBooks(), query] as const,
};

/** `GET /payments`; the previous page stays on screen while the next loads. */
export function usePayments(query: PaymentListQuery) {
  return useQuery({
    queryKey: paymentKeys.list(query),
    queryFn: ({ signal }) => listPayments(query, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
    retry: retryUnlessClientError,
  });
}

/** `GET /payments/:id`. */
export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: ({ signal }) => getPayment(id, signal),
    staleTime: STALE_TIME,
    retry: retryUnlessClientError,
  });
}

/** `GET /payments/cash-book`; the last range stays while the next loads. */
export function useCashBook(query: CashBookQuery) {
  return useQuery({
    queryKey: paymentKeys.cashBook(query),
    queryFn: ({ signal }) => getCashBook(query, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
    retry: retryUnlessClientError,
  });
}

/** A trader's open bills, oldest first. */
export interface OutstandingBills {
  bills: OutstandingBill[];
  /** The trader has more bills than were looked at. */
  more: boolean;
}

/** The server's largest list page. */
const BILL_PAGE = 100;

/**
 * The bills a voucher can settle, oldest first: the kissan's posted
 * purchases (paid) or the beopari's posted sales (received) with something
 * outstanding. Asks for the newest 100 bills, where the open ones are;
 * `more` says the trader has older bills that were not looked at. Shares
 * the bill lists' cache, so a saved voucher refreshes it with them.
 */
export function useOutstandingBills(
  direction: PaymentDirection,
  traderId: string | null,
) {
  const purchaseQuery: PurchaseListQuery = {
    page: 1,
    limit: BILL_PAGE,
    trader: traderId ?? "",
    status: "posted",
    sort: "-purchaseDate",
  };
  const saleQuery: SaleListQuery = {
    page: 1,
    limit: BILL_PAGE,
    buyer: traderId ?? "",
    status: "posted",
    sort: "-saleDate",
  };
  const paid = direction === "paid";
  return useQuery({
    queryKey: paid
      ? purchaseKeys.list(purchaseQuery)
      : saleKeys.list(saleQuery),
    queryFn: ({
      signal,
    }): Promise<ListResponse<PurchaseSummary | SaleSummary>> =>
      paid
        ? listPurchases(purchaseQuery, signal)
        : listSales(saleQuery, signal),
    select: (page): OutstandingBills => ({
      bills: oldestFirst(page.data),
      more: page.meta.total > page.data.length,
    }),
    enabled: Boolean(traderId),
    staleTime: STALE_TIME,
    retry: retryUnlessClientError,
  });
}

/**
 * A saved or cancelled voucher changes the trader's khata and balance, the
 * bills' outstanding amounts and the cash book: those refresh in the
 * background; the voucher itself goes into the detail cache.
 */
function storeSaved(queryClient: QueryClient, payment: Payment) {
  const detail: Payment & { warnings?: unknown } = { ...payment };
  delete detail.warnings;
  queryClient.setQueryData(paymentKeys.detail(payment.id), detail);
  void queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: paymentKeys.cashBooks() });
  void queryClient.invalidateQueries({
    queryKey: payment.direction === "paid" ? purchaseKeys.all : saleKeys.all,
  });
  void queryClient.invalidateQueries({
    queryKey: traderKeys.detail(payment.trader.id),
  });
  void queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
}

/** `POST /payments` with the form's Idempotency-Key. */
export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: CreatePaymentInput;
      idempotencyKey: string;
    }) => createPayment(input, idempotencyKey),
    onSuccess: ({ payment }) => storeSaved(queryClient, payment),
  });
}

/** `POST /payments/:id/cancel` (owner only). */
export function useCancelPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPayment(id),
    onSuccess: (payment) => storeSaved(queryClient, payment),
  });
}
