import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { dailySummary, purchasesByDay } from "@/features/dashboard/test-data";
import { formatMaund, formatRs } from "@/lib/format";
import { formatCell } from "./cell-format";
import {
  buildReportWorkbook,
  excelCell,
  excelDay,
  excelFormats,
  reportFileBase,
} from "./excel";
import {
  bookSheet,
  cashBookSheet,
  commissionSheet,
  dailySummarySheet,
  outstandingSheet,
  type ReportSheet,
} from "./sheet";
import {
  commodities,
  fullOutstanding,
  monthCashBook,
  monthCommission,
  monthPurchases,
  monthPurchasesByCommodity,
  monthSales,
} from "./test-data";

const NOW = new Date("2026-11-06T07:00:00Z");

function workbook(sheet: ReportSheet) {
  const book = buildReportWorkbook(XLSX, sheet, "Demo Mandi", NOW);
  // Round-trip through a real .xlsx file, as Excel would open it.
  const file = XLSX.write(book, { type: "array", bookType: "xlsx" });
  const read = XLSX.read(file, { cellNF: true });
  return read.Sheets[read.SheetNames[0]];
}

/** The rows of the sheet as cell objects (empty cells left out). */
function rows(ws: XLSX.WorkSheet): XLSX.CellObject[][] {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const out: XLSX.CellObject[][] = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row: XLSX.CellObject[] = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as
        XLSX.CellObject | undefined;
      row.push(cell ?? { t: "z" });
    }
    out.push(row);
  }
  return out;
}

const totalsRow = (ws: XLSX.WorkSheet, label = "Total") =>
  rows(ws).find((row) => String(row[0]?.v ?? "").startsWith(label)) ?? [];

describe("excel cells", () => {
  it("writes money and kg strings as numbers with their formats", () => {
    expect(excelCell({ kind: "money", value: "1245000.50" })).toEqual({
      t: "n",
      v: 1245000.5,
      z: "#,##0.00",
    });
    expect(excelCell({ kind: "kg", value: "86104.250" })).toEqual({
      t: "n",
      v: 86104.25,
      z: "#,##0.000",
    });
    expect(excelCell({ kind: "count", value: 1722 })).toEqual({
      t: "n",
      v: 1722,
      z: "#,##0",
    });
    // The largest numeric(14,2) amount stays exact.
    expect(excelCell({ kind: "money", value: "999999999999.99" }).v).toBe(
      999999999999.99,
    );
    expect(excelCell({ kind: "money", value: null })).toEqual({ t: "z" });
  });

  it("writes days as Excel dates, whatever the computer's time zone", () => {
    expect(excelDay("1900-03-01")).toBe(61);
    expect(excelDay("2026-11-06")).toBe(46332);
    expect(excelCell({ kind: "date", value: "2026-11-06" })).toEqual({
      t: "n",
      v: 46332,
      z: excelFormats.date,
    });
  });
});

describe("report workbooks", () => {
  it("starts with the title, shop, period, filters and print date", () => {
    const ws = workbook(bookSheet("purchases", monthPurchases));
    const head = rows(ws)
      .slice(0, 5)
      .map((row) => row.filter((c) => c.t !== "z").map((c) => c.v));
    expect(head).toEqual([
      ["Purchases report"],
      ["Shop", "Demo Mandi"],
      ["Period", "1 Nov 2026 – 6 Nov 2026"],
      ["Group by", "Day"],
      ["Printed on", "6 Nov 2026"],
    ]);
  });

  it("puts Rs and kg in the headings and formats every number cell", () => {
    const ws = workbook(bookSheet("purchases", monthPurchases));
    const all = rows(ws);
    const heading = all.findIndex((row) => row[0]?.v === "Date");
    expect(all[heading].map((c) => c.v)).toEqual([
      "Date",
      "Bills",
      "Bags",
      "Weight (kg)",
      "Gross (Rs)",
      "Deductions (Rs)",
      "Net (Rs)",
    ]);
    const first = all[heading + 1];
    expect(first[0]).toMatchObject({ t: "n", z: "d mmm yyyy" });
    expect(first[1]).toMatchObject({ t: "n", z: "#,##0" });
    expect(first[3]).toMatchObject({ t: "n", z: "#,##0.000" });
    for (const c of first.slice(4)) {
      expect(c).toMatchObject({ t: "n", z: "#,##0.00" });
    }
  });

  it("the purchases totals row is the server's totals, as on screen", () => {
    const sheet = bookSheet("purchases", monthPurchases);
    const totals = monthPurchases.totals;
    const excel = totalsRow(workbook(sheet)).map((c) => c.v);
    expect(excel).toEqual([
      "Total",
      totals.bills,
      totals.bags,
      Number(totals.weightKg),
      Number(totals.grossAmount),
      Number(totals.totalDeductions),
      Number(totals.netAmount),
    ]);
    // The screen's footer reads the same cells.
    const screen = (sheet.tables[0].totals ?? []).map((c) => formatCell(c));
    expect(screen).toEqual([
      "Total",
      totals.bills.toLocaleString("en-PK"),
      totals.bags.toLocaleString("en-PK"),
      formatMaund(totals.weightKg),
      formatRs(totals.grossAmount),
      formatRs(totals.totalDeductions),
      formatRs(totals.netAmount),
    ]);
  });

  it("the sales totals row has the charges and net of the server", () => {
    const totals = monthSales.totals;
    const excel = totalsRow(workbook(bookSheet("sales", monthSales))).map(
      (c) => c.v,
    );
    expect(excel.slice(4)).toEqual([
      Number(totals.grossAmount),
      Number(totals.totalCharges),
      Number(totals.netAmount),
    ]);
  });

  it("by commodity, leaves out the bill-level columns the server can't split", () => {
    const sheet = bookSheet("purchases", monthPurchasesByCommodity, {
      urduNames: new Map(commodities.map((c) => [c.id, c.nameUr])),
    });
    expect(sheet.tables[0].columns.map((c) => c.id)).toEqual([
      "group",
      "bills",
      "bags",
      "weight",
      "gross",
    ]);
    expect(sheet.tables[0].note).toMatch(/per bill/);
    expect(sheet.tables[0].rows[1].cells[0]).toMatchObject({
      value: "Gandum",
      secondary: "گندم",
    });
    expect(totalsRow(workbook(sheet)).map((c) => c.v)).toEqual([
      "Total",
      monthPurchasesByCommodity.totals.bills,
      monthPurchasesByCommodity.totals.bags,
      Number(monthPurchasesByCommodity.totals.weightKg),
      Number(monthPurchasesByCommodity.totals.grossAmount),
    ]);
  });

  it("commission: the totals row is the server's; other charges have none", () => {
    const ws = workbook(commissionSheet(monthCommission));
    const t = monthCommission.totals;
    expect(totalsRow(ws).map((c) => c.v)).toEqual([
      "Total",
      Number(t.purchases),
      Number(t.sales),
      Number(t.total),
    ]);
    const labour = rows(ws).find((row) => row[0]?.v === "Labour") ?? [];
    expect(labour.slice(1).map((c) => c.v)).toEqual([
      Number(monthCommission.otherCharges.labour.purchases),
      Number(monthCommission.otherCharges.labour.sales),
      Number(monthCommission.otherCharges.labour.total),
    ]);
  });

  it("outstanding: each side ends with its total and trader count", () => {
    const ws = workbook(outstandingSheet(fullOutstanding));
    const totals = rows(ws).filter((row) =>
      String(row[0]?.v ?? "").startsWith("Total"),
    );
    expect(totals.map((row) => [row[0].v, row[3].v])).toEqual([
      ["Total · 12 traders", Number(fullOutstanding.receivable.total)],
      ["Total · 8 traders", Number(fullOutstanding.payable.total)],
    ]);
    expect(totals[0][3].z).toBe("#,##0.00");
  });

  it("cash book: opening, cash in and out, and cash in hand of the server", () => {
    const ws = workbook(cashBookSheet(monthCashBook));
    expect(totalsRow(ws).map((c) => c.v)).toEqual([
      "Total",
      Number(monthCashBook.openingCash),
      Number(monthCashBook.totals.cashIn),
      Number(monthCashBook.totals.cashOut),
      Number(monthCashBook.closingCash),
    ]);
    // Each day opens with the day before's closing.
    const days = rows(ws).filter((row) => row[0]?.z === "d mmm yyyy");
    expect(days[1][1].v).toBe(Number(monthCashBook.days[0].closingCash));
  });

  it("daily summary: label / value lines with the unit in the label", () => {
    const names = new Map(
      commodities.map((c) => [c.id, { name: c.name, nameUr: c.nameUr }]),
    );
    const ws = workbook(dailySummarySheet(dailySummary, names));
    const line = (label: string) =>
      rows(ws).find((row) => row[0]?.v === label) ?? [];
    expect(line("Weight (kg)")[1]).toMatchObject({
      v: Number(dailySummary.purchases.weightKg),
      z: "#,##0.000",
    });
    expect(line("Cash in hand (Rs)")[1]).toMatchObject({
      v: Number(dailySummary.cash.closingCash),
      z: "#,##0.00",
    });
    expect(line("Gandum")[0].v).toBe("Gandum");
  });

  it("names the file after the report and its dates", () => {
    expect(reportFileBase(bookSheet("purchases", monthPurchases))).toBe(
      "purchases-report-2026-11-01_2026-11-06",
    );
    expect(
      reportFileBase(
        bookSheet("sales", {
          ...purchasesByDay,
          from: "2026-11-06",
          to: "2026-11-06",
        }),
      ),
    ).toBe("sales-report-2026-11-06");
  });
});
