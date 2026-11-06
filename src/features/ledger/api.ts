import { api } from "@/lib/api";
import {
  type Balances,
  type BalancesQuery,
  type Statement,
  type StatementEntry,
  type StatementQuery,
  STATEMENT_MAX_LIMIT,
} from "./types";

/** `GET /ledger/:traderId`: one page of the khata with opening/closing balance. */
export async function getStatement(
  traderId: string,
  query: StatementQuery,
  signal?: AbortSignal,
): Promise<Statement> {
  const { data } = await api.get<Statement>(
    `/ledger/${encodeURIComponent(traderId)}`,
    { params: query, signal },
  );
  return data;
}

/**
 * The whole statement of a period (every page, 500 lines a request), for
 * printing and export: a long khata is paged on screen but prints in full.
 */
export async function getFullStatement(
  traderId: string,
  range: Pick<StatementQuery, "from" | "to">,
  signal?: AbortSignal,
): Promise<Statement> {
  const limit = STATEMENT_MAX_LIMIT;
  const first = await getStatement(
    traderId,
    { ...range, page: 1, limit },
    signal,
  );
  const data: StatementEntry[] = [...first.data];
  const pages = Math.ceil(first.meta.total / limit);
  for (let page = 2; page <= pages; page += 1) {
    const next = await getStatement(
      traderId,
      { ...range, page, limit },
      signal,
    );
    data.push(...next.data);
  }
  return {
    ...first,
    data,
    meta: { page: 1, limit: data.length, total: first.meta.total },
  };
}

/** `GET /ledger/balances`: every trader with receivable / payable. */
export async function listBalances(
  query: BalancesQuery,
  signal?: AbortSignal,
): Promise<Balances> {
  const { data } = await api.get<Balances>("/ledger/balances", {
    params: query,
    signal,
  });
  return data;
}
