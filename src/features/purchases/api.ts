import { api } from "@/lib/api";
import type { ListResponse } from "@/lib/list-query";
import type {
  CreatePurchaseInput,
  Purchase,
  PurchaseListQuery,
  PurchaseSummary,
  SavedPurchase,
  UpdatePurchaseInput,
} from "./types";

/** Header the server uses to save a purchase once, however often it is sent. */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

const path = (id: string) => `/purchases/${encodeURIComponent(id)}`;

/** `GET /purchases`: one page, newest first by default. */
export async function listPurchases(
  query: PurchaseListQuery,
  signal?: AbortSignal,
): Promise<ListResponse<PurchaseSummary>> {
  const { data } = await api.get<ListResponse<PurchaseSummary>>("/purchases", {
    params: query,
    signal,
  });
  return data;
}

/** `GET /purchases/:id` with items and charges. */
export async function getPurchase(
  id: string,
  signal?: AbortSignal,
): Promise<Purchase> {
  const { data } = await api.get<Purchase>(path(id), { signal });
  return data;
}

/**
 * `POST /purchases`. Send the same `idempotencyKey` on every retry of one
 * save: the server answers 201 the first time and 200 with the same purchase
 * after that, so a retry never saves twice.
 */
export async function createPurchase(
  input: CreatePurchaseInput,
  idempotencyKey: string,
): Promise<SavedPurchase> {
  const response = await api.post<Purchase>("/purchases", input, {
    headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
  });
  return { purchase: response.data, replayed: response.status === 200 };
}

/** `PATCH /purchases/:id`; 403 `DAY_CLOSED`, 409 `PURCHASE_CANCELLED`. */
export async function updatePurchase(
  id: string,
  input: UpdatePurchaseInput,
): Promise<Purchase> {
  const { data } = await api.patch<Purchase>(path(id), input);
  return data;
}

/** `POST /purchases/:id/cancel`; 409 `PURCHASE_CANCELLED` the second time. */
export async function cancelPurchase(id: string): Promise<Purchase> {
  const { data } = await api.post<Purchase>(`${path(id)}/cancel`);
  return data;
}
