import type { CellObject, WorkBook } from "xlsx";
import { formatDate } from "@/lib/format";
import type {
  CellKind,
  ReportCell,
  ReportSheet,
  ReportTable,
  SheetWords,
} from "./sheet";

/**
 * A report as an `.xlsx` file (SheetJS): the title, shop, period and filter
 * lines, then each table with its totals row. Money and weight are real
 * number cells with number formats, so Excel can add them up; the server's
 * decimal strings are only converted for the file (no maths): a
 * numeric(14,2) amount has at most 14 digits, which a spreadsheet number
 * holds exactly. The totals row is the server's totals, as on screen.
 */

type XLSXModule = typeof import("xlsx");

/** Excel number formats of each kind of cell. */
export const excelFormats = {
  money: "#,##0.00",
  kg: "#,##0.000",
  count: "#,##0",
  date: "d mmm yyyy",
} as const;

/** Days from Excel's day 0 (30 Dec 1899) to a `YYYY-MM-DD` day. */
export function excelDay(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

/** One cell; money and kg strings become numbers with their format. */
export function excelCell(cell: ReportCell): CellObject {
  switch (cell.kind) {
    case "text":
      return { t: "s", v: cell.value };
    case "date":
      return { t: "n", v: excelDay(cell.value), z: excelFormats.date };
    case "count":
      return { t: "n", v: cell.value, z: excelFormats.count };
    case "money":
    case "kg": {
      const value = cell.value?.trim();
      if (!value || !/^-?\d+(\.\d+)?$/.test(value)) return { t: "z" };
      return { t: "n", v: Number(value), z: excelFormats[cell.kind] };
    }
  }
}

const unitSuffix = (t: SheetWords["t"], kind: CellKind) =>
  kind === "money"
    ? ` ${t("document.rupees")}`
    : kind === "kg"
      ? ` ${t("document.kg")}`
      : "";

const label = (value: string): CellObject => ({ t: "s", v: value });

/** A table's rows of cells: title, headings, rows, totals. */
function tableRows(t: SheetWords["t"], table: ReportTable): CellObject[][] {
  const out: CellObject[][] = [];
  if (table.title) out.push([label(table.title)]);
  if (table.layout === "pairs") {
    // "Weight (kg)" | 1000.000 — the unit goes on the line's label.
    for (const row of table.rows) {
      const [name, value] = row.cells;
      out.push([
        label(
          `${(name as { value: string }).value}${unitSuffix(t, value.kind)}`,
        ),
        excelCell(value),
      ]);
    }
  } else {
    out.push(
      table.columns.map((c) => label(`${c.label}${unitSuffix(t, c.kind)}`)),
    );
    if (table.rows.length === 0 && table.empty) out.push([label(table.empty)]);
    for (const row of table.rows) out.push(row.cells.map(excelCell));
    if (table.totals) out.push(table.totals.map(excelCell));
  }
  if (table.note) out.push([label(table.note)]);
  return out;
}

/** Every row of the sheet, heading lines first. */
export function reportSheetRows(
  { t, locale }: SheetWords,
  sheet: ReportSheet,
  shopName: string | null,
  now: Date = new Date(),
): CellObject[][] {
  const rows: CellObject[][] = [
    [label(sheet.title)],
    ...(shopName ? [[label(t("document.shop")), label(shopName)]] : []),
    [label(t("document.period")), label(sheet.period)],
    ...sheet.filters.map(([name, value]) => [label(name), label(value)]),
    [label(t("document.printedOn")), label(formatDate(now, locale))],
  ];
  for (const table of sheet.tables) {
    rows.push([]);
    rows.push(...tableRows(t, table));
  }
  return rows;
}

/** The workbook of a report: one sheet named after it. */
export function buildReportWorkbook(
  XLSX: XLSXModule,
  words: SheetWords,
  sheet: ReportSheet,
  shopName: string | null,
  now: Date = new Date(),
): WorkBook {
  const rows = reportSheetRows(words, sheet, shopName, now);
  const ws = XLSX.utils.aoa_to_sheet([]);
  rows.forEach((cells, r) =>
    cells.forEach((cell, c) => {
      ws[XLSX.utils.encode_cell({ r, c })] = cell;
    }),
  );
  const width = Math.max(2, ...rows.map((cells) => cells.length));
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(0, rows.length - 1), c: width - 1 },
  });
  ws["!cols"] = Array.from({ length: width }, (_, i) => ({
    wch: i === 0 ? 30 : 18,
  }));
  const book = XLSX.utils.book_new();
  // Excel sheet names are at most 31 characters.
  XLSX.utils.book_append_sheet(
    book,
    ws,
    words.t(`reports.${sheet.slug}.title`).slice(0, 31),
  );
  return book;
}

/** `purchases-report-2026-11-01_2026-11-06` (no extension). */
export function reportFileBase(sheet: ReportSheet): string {
  return `${reportFiles[sheet.slug]}-${sheet.periodKey}`;
}

/** File names stay in plain Latin letters in every language. */
const reportFiles = {
  "daily-summary": "daily-summary",
  purchases: "purchases-report",
  sales: "sales-report",
  commission: "commission-report",
  outstanding: "outstanding-report",
  "cash-book": "cash-book",
} as const satisfies Record<ReportSheet["slug"], string>;

/** Writes the report to `<report>-<period>.xlsx`; SheetJS loads on demand. */
export async function exportReportToExcel(
  words: SheetWords,
  sheet: ReportSheet,
  shopName: string | null,
): Promise<void> {
  const XLSX = await import("xlsx");
  const book = buildReportWorkbook(XLSX, words, sheet, shopName);
  XLSX.writeFile(book, `${reportFileBase(sheet)}.xlsx`, { compression: true });
}
