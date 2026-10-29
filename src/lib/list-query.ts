/**
 * Shared list contract between the tables and the server.
 *
 * The URL (and `useDataTableState`) uses the ticket's keys:
 * `?page=&limit=&sort=&q=&<filters>`. The server's list endpoints take
 * `search` instead of `q` (server CLAUDE.md: `?page=&limit=&search=&sort=`),
 * so `toListSearchParams` renames `q` → `search` and drops empty values
 * before the request goes out.
 */

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
}

/** What every list endpoint returns. */
export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}

/** List state as the table keeps it (`q` = search), plus any filters. */
export interface ListParams {
  page: number;
  limit: number;
  sort?: string | null;
  q?: string | null;
}

/** `ListParams` as the server wants them: `search`, no empty values. */
export type ListSearchParams<P> = { page: number; limit: number } & {
  [
    K in keyof P as K extends "page" | "limit"
      ? never
      : K extends "q"
        ? "search"
        : K
  ]?: NonNullable<P[K]>;
};

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** `{ q: "okara", status: null, page: 1 }` → `{ search: "okara", page: 1 }`. */
export function toListSearchParams<P extends ListParams>(
  params: P,
): ListSearchParams<P> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (isEmpty(value)) continue;
    out[key === "q" ? "search" : key] = value;
  }
  return out as ListSearchParams<P>;
}
