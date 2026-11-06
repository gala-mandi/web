import { parseAsString, parseAsStringLiteral } from "nuqs";
import { parseAsDay } from "@/components/data-table";
import { traderTypes } from "@/features/traders/types";

/**
 * The khata in the URL: `?trader=&from=&to=` (plus the table's `page`,
 * `limit`), so a reload, Back and a shared link show the same statement.
 * Module scope: the hook needs a stable object.
 */
export const khataFilters = {
  trader: parseAsString,
  from: parseAsDay,
  to: parseAsDay,
};

/** Balances in the URL: `?type=` (plus `page`, `limit`, `sort`, `q`). */
export const balanceFilters = {
  type: parseAsStringLiteral(traderTypes),
};

/** Lines per page of the on-screen khata. */
export const KHATA_PAGE_SIZE = 50;
