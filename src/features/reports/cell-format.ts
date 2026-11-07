import { formatCount, formatDate, formatMaund, formatRs } from "@/lib/format";
import type { ReportCell } from "./sheet";
import { defaultLocale, type Locale } from "@/i18n/config";

/**
 * A report cell as text on screen and on paper: rupees with `formatRs`,
 * weight as maund + kg with `formatMaund` (the shop's maund, 40 kg by
 * default), days in Asia/Karachi. The server's values, only formatted.
 */
/** An empty cell, the same in every language. */
const NONE = "—";

export function formatCell(
  cell: ReportCell,
  maundKg = "40",
  locale: Locale = defaultLocale,
): string {
  switch (cell.kind) {
    case "text":
      return cell.value;
    case "date":
      return formatDate(cell.value, locale);
    case "count":
      return formatCount(cell.value, locale);
    case "money":
      return cell.value === null ? NONE : formatRs(cell.value, locale) || NONE;
    case "kg":
      return cell.value === null
        ? NONE
        : formatMaund(cell.value, maundKg, locale) || NONE;
  }
}

/** Numbers line up at the end of the cell. */
export const isNumeric = (kind: ReportCell["kind"]) =>
  kind === "money" || kind === "kg" || kind === "count";
