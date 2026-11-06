import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { retryUnlessClientError } from "@/features/traders/hooks";
import { getFullStatement, getStatement, listBalances } from "./api";
import type { BalancesQuery, StatementQuery } from "./types";

type Range = Pick<StatementQuery, "from" | "to">;

export const ledgerKeys = {
  all: ["ledger"] as const,
  statements: () => [...ledgerKeys.all, "statement"] as const,
  statement: (traderId: string, query: StatementQuery) =>
    [...ledgerKeys.statements(), traderId, query] as const,
  fullStatement: (traderId: string, range: Range) =>
    [...ledgerKeys.statements(), traderId, "full", range] as const,
  balances: (query: BalancesQuery) =>
    [...ledgerKeys.all, "balances", query] as const,
};

const STALE_TIME = 30_000;

/**
 * `GET /ledger/:traderId`; nothing is asked until a trader is picked. The
 * previous page stays on screen while the next one loads.
 */
export function useStatement(traderId: string | null, query: StatementQuery) {
  return useQuery({
    queryKey: ledgerKeys.statement(traderId ?? "", query),
    queryFn: ({ signal }) => getStatement(traderId as string, query, signal),
    enabled: Boolean(traderId),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
    retry: retryUnlessClientError,
  });
}

/** Loads (or reuses) every line of a period, for print and export. */
export function useFullStatementLoader() {
  const queryClient = useQueryClient();
  return useCallback(
    (traderId: string, range: Range) =>
      queryClient.fetchQuery({
        queryKey: ledgerKeys.fullStatement(traderId, range),
        queryFn: ({ signal }) => getFullStatement(traderId, range, signal),
        staleTime: STALE_TIME,
      }),
    [queryClient],
  );
}

/** `GET /ledger/balances`; the previous page stays while the next loads. */
export function useBalances(query: BalancesQuery) {
  return useQuery({
    queryKey: ledgerKeys.balances(query),
    queryFn: ({ signal }) => listBalances(query, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
    retry: retryUnlessClientError,
  });
}
