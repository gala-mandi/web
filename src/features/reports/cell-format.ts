import { formatDate, formatMaund, formatRs } from "@/lib/format";
import type { ReportCell } from "./sheet";
import { reportText } from "./text";

/**
 * A report cell as text on screen and on paper: rupees with `formatRs`,
 * weight as maund + kg with `formatMaund` (the shop's maund, 40 kg by
 * default), days in Asia/Karachi. The server's values, only formatted.
 */
export function formatCell(cell: ReportCell, maundKg = "40"): string {
  switch (cell.kind) {
    case "text":
      return cell.value;
    case "date":
      return formatDate(cell.value);
    case "count":
      return cell.value.toLocaleString("en-PK");
    case "money":
      return cell.value === null
        ? reportText.none
        : formatRs(cell.value) || reportText.none;
    case "kg":
      return cell.value === null
        ? reportText.none
        : formatMaund(cell.value, maundKg) || reportText.none;
  }
}

/** Numbers line up at the end of the cell. */
export const isNumeric = (kind: ReportCell["kind"]) =>
  kind === "money" || kind === "kg" || kind === "count";
