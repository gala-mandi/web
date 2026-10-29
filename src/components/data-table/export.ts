import type { ColumnVisibilityState, RowData } from "@tanstack/react-table";
import {
  type DataTableColumn,
  type DataTableExportValue,
  getLabelledColumns,
} from "./columns";

export interface ExportToExcelOptions<TData extends RowData> {
  /** Base name; the Karachi date and `.xlsx` are added: `shops-2026-10-29.xlsx`. */
  fileName: string;
  /** The table's columns; only labelled, visible ones are written. */
  columns: DataTableColumn<TData>[];
  /** The rows on screen (the current page). */
  rows: TData[];
  /** Hidden columns are left out. */
  columnVisibility?: ColumnVisibilityState;
}

const karachiDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `shops` → `shops-2026-10-29.xlsx` (today in Asia/Karachi). */
export function exportFileName(base: string, now: Date = new Date()): string {
  return `${base}-${karachiDay.format(now)}.xlsx`;
}

function cell(value: DataTableExportValue): string | number | boolean | Date {
  return value ?? "";
}

/**
 * Writes the current view (rows on screen, visible labelled columns) to an
 * `.xlsx` file. SheetJS is loaded on demand so it stays out of the main bundle.
 */
export async function exportToExcel<TData extends RowData>({
  fileName,
  columns,
  rows,
  columnVisibility = {},
}: ExportToExcelOptions<TData>): Promise<void> {
  const visible = getLabelledColumns(columns).filter(
    (column) => columnVisibility[column.id] !== false,
  );
  const sheetRows = [
    visible.map((column) => column.label),
    ...rows.map((row, index) =>
      visible.map((column) => cell(column.value(row, index))),
    ),
  ];

  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const book = XLSX.utils.book_new();
  // Excel sheet names are at most 31 characters.
  XLSX.utils.book_append_sheet(book, sheet, fileName.slice(0, 31) || "Sheet1");
  XLSX.writeFile(book, exportFileName(fileName), { compression: true });
}
