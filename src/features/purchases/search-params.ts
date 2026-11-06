import { parseAsString, parseAsStringLiteral } from "nuqs";
import { parseAsDay } from "@/components/data-table";

/** Statuses a list can be filtered by (the server never creates drafts). */
export const purchaseListStatuses = ["posted", "cancelled"] as const;

/**
 * Filters of the purchases list in the URL:
 * `?from=&to=&trader=&commodity=&status=` (plus the table's `page`, `limit`,
 * `sort`, `q`). Module scope: the hook needs a stable object.
 */
export const purchaseListFilters = {
  from: parseAsDay,
  to: parseAsDay,
  trader: parseAsString,
  commodity: parseAsString,
  status: parseAsStringLiteral(purchaseListStatuses),
};

export const PURCHASES_TABLE_ID = "purchases";
