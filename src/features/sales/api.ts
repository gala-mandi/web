import { IDEMPOTENCY_HEADER } from "@/features/purchases/api";
import { api } from "@/lib/api";
import type { ListResponse } from "@/lib/list-query";
import type {
  CreateSaleInput,
  Sale,
  SaleListQuery,
  SaleSummary,
  SaleWithWarnings,
  SavedSale,
  UpdateSaleInput,
} from "./types";

const path = (id: string) => `/sales/${encodeURIComponent(id)}`;

/** `GET /sales`: one page, newest first by default. */
export async function listSales(
  query: SaleListQuery,
  signal?: AbortSignal,
): Promise<ListResponse<SaleSummary>> {
  const { data } = await api.get<ListResponse<SaleSummary>>("/sales", {
    params: query,
    signal,
  });
  return data;
}

/** `GET /sales/:id` with items and charges. */
export async function getSale(id: string, signal?: AbortSignal): Promise<Sale> {
  const { data } = await api.get<Sale>(path(id), { signal });
  return data;
}

/**
 * `POST /sales`. Send the same `idempotencyKey` on every retry of one save:
 * 201 the first time, 200 with the same sale (and no warnings) after that.
 * 409 `CREDIT_LIMIT_EXCEEDED` when the shop blocks sales over the limit.
 */
export async function createSale(
  input: CreateSaleInput,
  idempotencyKey: string,
): Promise<SavedSale> {
  const response = await api.post<SaleWithWarnings>("/sales", input, {
    headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
  });
  return { sale: response.data, replayed: response.status === 200 };
}

/**
 * `PATCH /sales/:id`; 403 `DAY_CLOSED`, 409 `SALE_CANCELLED` or
 * `CREDIT_LIMIT_EXCEEDED`.
 */
export async function updateSale(
  id: string,
  input: UpdateSaleInput,
): Promise<SaleWithWarnings> {
  const { data } = await api.patch<SaleWithWarnings>(path(id), input);
  return data;
}

/** `POST /sales/:id/cancel`; 409 `SALE_CANCELLED` the second time. */
export async function cancelSale(id: string): Promise<Sale> {
  const { data } = await api.post<Sale>(`${path(id)}/cancel`);
  return data;
}
