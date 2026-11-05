import { parseAsString, parseAsStringLiteral } from "nuqs";

export const commodityStatuses = ["active", "inactive"] as const;
export type CommodityStatus = (typeof commodityStatuses)[number];

/**
 * Filters of the commodities list in the URL: `?status=inactive&category=grain`
 * (plus the table's `page`, `limit`, `sort`, `q`). Module scope: the hook
 * needs a stable object.
 */
export const commodityListFilters = {
  status: parseAsStringLiteral(commodityStatuses),
  category: parseAsString,
};

export const COMMODITIES_TABLE_ID = "commodities";
