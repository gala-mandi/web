import { parseAsStringLiteral } from "nuqs";
import { traderTypes } from "./types";

export const traderStatuses = ["active", "inactive"] as const;
export type TraderStatus = (typeof traderStatuses)[number];

/**
 * Filters of the traders list in the URL: `?type=kissan&status=inactive`
 * (plus the table's `page`, `limit`, `sort`, `q`). Module scope: the hook
 * needs a stable object.
 */
export const traderListFilters = {
  type: parseAsStringLiteral(traderTypes),
  status: parseAsStringLiteral(traderStatuses),
};

export const TRADERS_TABLE_ID = "traders";
