import { parseAsString, parseAsStringLiteral } from "nuqs";
import { parseAsDay } from "@/components/data-table";
import { purchaseListStatuses } from "@/features/purchases/search-params";

/** Statuses a list can be filtered by (the server never creates drafts). */
export const saleListStatuses = purchaseListStatuses;

/**
 * Filters of the sales list in the URL:
 * `?from=&to=&buyer=&commodity=&status=` (plus the table's `page`, `limit`,
 * `sort`, `q`). Module scope: the hook needs a stable object.
 */
export const saleListFilters = {
  from: parseAsDay,
  to: parseAsDay,
  buyer: parseAsString,
  commodity: parseAsString,
  status: parseAsStringLiteral(saleListStatuses),
};

export const SALES_TABLE_ID = "sales";
