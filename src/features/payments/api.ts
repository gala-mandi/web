import { IDEMPOTENCY_HEADER } from "@/features/purchases/api";
import { api } from "@/lib/api";
import type { ListResponse } from "@/lib/list-query";
import type {
  CashBook,
  CashBookQuery,
  CreatePaymentInput,
  Payment,
  PaymentListQuery,
  PaymentSummary,
  PaymentWithWarnings,
  SavedPayment,
} from "./types";

const path = (id: string) => `/payments/${encodeURIComponent(id)}`;

/** `GET /payments`: one page, newest first by default. */
export async function listPayments(
  query: PaymentListQuery,
  signal?: AbortSignal,
): Promise<ListResponse<PaymentSummary>> {
  const { data } = await api.get<ListResponse<PaymentSummary>>("/payments", {
    params: query,
    signal,
  });
  return data;
}

/** `GET /payments/:id` with the bills it settles. */
export async function getPayment(
  id: string,
  signal?: AbortSignal,
): Promise<Payment> {
  const { data } = await api.get<Payment>(path(id), { signal });
  return data;
}

/**
 * `POST /payments`. Send the same `idempotencyKey` on every retry of one
 * save: 201 the first time, 200 with the same voucher (no warnings) after
 * that. 409 `OVERPAYMENT` when the shop blocks paying more than the khata
 * owes (nothing is saved).
 */
export async function createPayment(
  input: CreatePaymentInput,
  idempotencyKey: string,
): Promise<SavedPayment> {
  const response = await api.post<PaymentWithWarnings>("/payments", input, {
    headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
  });
  return { payment: response.data, replayed: response.status === 200 };
}

/** `POST /payments/:id/cancel` (owner); 409 `PAYMENT_CANCELLED` the second time. */
export async function cancelPayment(id: string): Promise<Payment> {
  const { data } = await api.post<Payment>(`${path(id)}/cancel`);
  return data;
}

/** `GET /payments/cash-book?from=&to=`: daily cash in, out and in hand. */
export async function getCashBook(
  query: CashBookQuery,
  signal?: AbortSignal,
): Promise<CashBook> {
  const { data } = await api.get<CashBook>("/payments/cash-book", {
    params: query,
    signal,
  });
  return data;
}
