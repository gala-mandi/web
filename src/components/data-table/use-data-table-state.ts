"use client";

import type { PaginationState, SortingState } from "@tanstack/react-table";
import {
  createParser,
  type Nullable,
  parseAsInteger,
  parseAsString,
  type ParserMap,
  useQueryStates,
  type Values,
} from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";

/** `field` (ascending) or `-field` (descending), as the server takes it. */
export type SortValue<TField extends string> = TField | `-${TField}`;

/** A calendar day in the URL as `YYYY-MM-DD` (for date range filters). */
export const parseAsDay = createParser<string>({
  parse: (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
      ? value
      : null;
  },
  serialize: (value) => value,
});

export interface UseDataTableStateOptions<
  TFilters extends ParserMap,
  TSortField extends string,
> {
  /**
   * nuqs parsers of the filters, keyed by their URL key (e.g.
   * `{ status: parseAsStringLiteral(statuses) }`). Must be a stable object
   * (module scope). `page`, `limit`, `sort` and `q` are taken.
   */
  filters?: TFilters;
  /** Fields the server can sort by; any other `?sort=` is ignored. */
  sortFields?: readonly TSortField[];
  /** Sort when the URL has none; kept out of the URL. */
  defaultSort?: SortValue<TSortField>;
  /** Rows per page when the URL has no `limit` (default 20). */
  pageSize?: number;
  /** Largest `?limit=` accepted (the server caps lists at 100). */
  maxPageSize?: number;
  /** Search waits this long after the last key stroke (default 300 ms). */
  debounceMs?: number;
  /** `push` (default) lets Back undo a filter; `replace` doesn't. */
  history?: "push" | "replace";
}

/** What the API needs: page, limit, sort, `q` (search) and the filters. */
export type DataTableListParams<
  TFilters extends ParserMap,
  TSortField extends string,
> = {
  page: number;
  limit: number;
  sort?: SortValue<TSortField>;
  q?: string;
} & Values<TFilters>;

export interface DataTableState<
  TFilters extends ParserMap,
  TSortField extends string,
> {
  pagination: PaginationState;
  sorting: SortingState;
  onPaginationChange: (next: PaginationState) => void;
  /** Also goes back to page 1. */
  onSortingChange: (next: SortingState) => void;
  /** What is in the search box now (the URL follows after the debounce). */
  search: string;
  setSearch: (value: string) => void;
  /** Current filter values from the URL (`null` = not set). */
  filters: Values<TFilters>;
  /** Sets one filter and goes back to page 1. */
  setFilter: <K extends keyof TFilters & string>(
    key: K,
    value: Values<TFilters>[K] | null,
  ) => void;
  /** Sets several filters at once (one URL update) and goes back to page 1. */
  setFilters: (values: Partial<Nullable<Values<TFilters>>>) => void;
  /** Clears search and every filter (keeps the sort). */
  clearAll: () => void;
  /** A search or filter is applied. */
  isFiltered: boolean;
  /** Pass to `toListSearchParams` for the request. */
  listParams: DataTableListParams<TFilters, TSortField>;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGE_SIZE = 100;
const DEFAULT_DEBOUNCE_MS = 300;
const noFilters = {} as ParserMap;

function parseSort<TField extends string>(
  raw: string | null,
  fields: readonly TField[] | undefined,
): SortValue<TField> | null {
  if (!raw) return null;
  const field = raw.replace(/^-/, "");
  if (fields ? !fields.includes(field as TField) : !/^[\w.]+$/.test(field)) {
    return null;
  }
  return raw as SortValue<TField>;
}

function isSet(value: unknown, fallback: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (fallback === undefined) return true;
  return JSON.stringify(value) !== JSON.stringify(fallback);
}

/**
 * List state of a `DataTable` in the URL (nuqs): `?page=&limit=&sort=&q=`
 * plus the caller's filters, so refresh, Back and shared links keep the same
 * view. Changing sort, search or a filter goes back to page 1.
 */
export function useDataTableState<
  TFilters extends ParserMap = Record<never, never>,
  TSortField extends string = string,
>(
  options: UseDataTableStateOptions<TFilters, TSortField> = {},
): DataTableState<TFilters, TSortField> {
  const {
    filters: filterParsers = noFilters as TFilters,
    sortFields,
    defaultSort,
    pageSize = DEFAULT_PAGE_SIZE,
    maxPageSize = DEFAULT_MAX_PAGE_SIZE,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    history = "push",
  } = options;

  const keyMap = useMemo(
    () => ({
      ...filterParsers,
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(pageSize),
      sort: parseAsString,
      q: parseAsString.withDefault(""),
    }),
    [filterParsers, pageSize],
  );
  const [state, setState] = useQueryStates(keyMap, { history });
  // nuqs types the merged map loosely; read our own keys through this.
  const base = state as unknown as {
    page: number;
    limit: number;
    sort: string | null;
    q: string;
  };
  const set = setState as unknown as (
    values: Record<string, unknown>,
  ) => Promise<URLSearchParams>;

  const filterKeys = useMemo(
    () => Object.keys(filterParsers) as (keyof TFilters & string)[],
    [filterParsers],
  );

  const page = Math.max(1, base.page);
  const limit = Math.min(maxPageSize, Math.max(1, base.limit));
  const sort = parseSort(base.sort, sortFields) ?? defaultSort ?? null;
  const q = base.q;

  // The input updates at once; the URL (and the request) after a pause.
  const [draft, setDraft] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  const [pushedQ, setPushedQ] = useState<string | null>(null);
  if (q !== seenQ) {
    setSeenQ(q);
    // Our own debounced push landing: keep what was typed since. Anything
    // else (Back/Forward, a link, Clear) is shown in the input.
    if (q === pushedQ) setPushedQ(null);
    else setDraft(q);
  }

  useEffect(() => {
    const next = draft.trim();
    if (next === q) return;
    const timer = setTimeout(() => {
      setPushedQ(next);
      void set({ q: next || null, page: null });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [draft, q, set, debounceMs]);

  const filters = useMemo(
    () =>
      Object.fromEntries(
        filterKeys.map((key) => [key, (state as Record<string, unknown>)[key]]),
      ) as Values<TFilters>,
    [filterKeys, state],
  );

  const isFiltered =
    q !== "" ||
    filterKeys.some((key) =>
      isSet(
        (filters as Record<string, unknown>)[key],
        filterParsers[key]?.defaultValue,
      ),
    );

  const onPaginationChange = useCallback(
    (next: PaginationState) => {
      const sizeChanged = next.pageSize !== limit;
      void set({
        page: sizeChanged || next.pageIndex === 0 ? null : next.pageIndex + 1,
        limit: next.pageSize === pageSize ? null : next.pageSize,
      });
    },
    [limit, pageSize, set],
  );

  const onSortingChange = useCallback(
    (next: SortingState) => {
      const first = next[0];
      const value = first
        ? parseSort(`${first.desc ? "-" : ""}${first.id}`, sortFields)
        : null;
      void set({
        sort: value === null || value === defaultSort ? null : value,
        page: null,
      });
    },
    [defaultSort, set, sortFields],
  );

  const setFilters = useCallback(
    (values: Partial<Nullable<Values<TFilters>>>) =>
      void set({ ...values, page: null }),
    [set],
  );

  const setFilter = useCallback(
    <K extends keyof TFilters & string>(
      key: K,
      value: Values<TFilters>[K] | null,
    ) => void set({ [key]: value, page: null }),
    [set],
  );

  const clearAll = useCallback(() => {
    setDraft("");
    void set({
      ...Object.fromEntries(filterKeys.map((key) => [key, null])),
      q: null,
      page: null,
    });
  }, [filterKeys, set]);

  const listParams = {
    ...filters,
    page,
    limit,
    ...(sort ? { sort } : {}),
    ...(q ? { q } : {}),
  } as DataTableListParams<TFilters, TSortField>;

  return {
    pagination: { pageIndex: page - 1, pageSize: limit },
    sorting: sort
      ? [{ id: sort.replace(/^-/, ""), desc: sort.startsWith("-") }]
      : [],
    onPaginationChange,
    onSortingChange,
    search: draft,
    setSearch: setDraft,
    filters,
    setFilter,
    setFilters,
    clearAll,
    isFiltered,
    listParams,
  };
}
