import { describe, expect, it } from "vitest";
import {
  statementBalance,
  statementFileBase,
  statementPeriod,
  statementRows,
} from "./statement";
import { statement } from "./test-data";

const NOW = new Date("2026-11-06T07:00:00.000Z");

describe("statementRows (Excel)", () => {
  it("writes the heading, opening balance, every line and the closing balance", () => {
    const rows = statementRows(statement(), "en", "Demo Mandi", NOW);
    expect(rows.slice(0, 5)).toEqual([
      ["Khata statement"],
      ["Shop", "Demo Mandi"],
      ["Trader", "Rafiq Ahmad (Kissan)"],
      ["Period", "From 1 Nov 2026"],
      ["Printed on", "6 Nov 2026"],
    ]);
    expect(rows[6]).toEqual([
      "Date",
      "Details",
      "Dr (debit)",
      "Cr (credit)",
      "Balance",
      "",
    ]);
    expect(rows[7]).toEqual([
      "",
      "Opening balance",
      "",
      "",
      "Rs 10,000.00",
      "Dr",
    ]);
    expect(rows[8]).toEqual([
      "2 Nov 2026",
      "Purchase — Purchase PUR-2026-27-000001",
      "",
      "Rs 100,000.00",
      "Rs 90,000.00",
      "Cr",
    ]);
    expect(rows[11][1]).toBe("Adjustment — Rounding agreed with Rafiq");
    expect(rows[13]).toEqual([
      "",
      "Closing balance",
      "",
      "",
      "Rs 20,500.00",
      "Cr",
    ]);
  });

  it("writes an Urdu statement with Urdu headings, بنام / جمع and Urdu dates", () => {
    const rows = statementRows(statement(), "ur", null, NOW);
    expect(rows[0]).toEqual(["کھاتہ اسٹیٹمنٹ"]);
    expect(rows[1]).toEqual(["نام", "Rafiq Ahmad (کسان)"]);
    expect(rows[5]).toEqual(["تاریخ", "تفصیل", "بنام", "جمع", "بقایا", ""]);
    expect(rows[6]).toEqual([
      "",
      "سابقہ بقایا",
      "",
      "",
      "10,000.00 روپے",
      "بنام",
    ]);
    expect(rows.at(-3)).toEqual([
      "",
      "موجودہ بقایا",
      "",
      "",
      "20,500.00 روپے",
      "جمع",
    ]);
    expect(rows[7][0]).toMatch(/2026/);
    expect(rows[7][0]).not.toMatch(/Nov/);
  });
});

describe("statement helpers", () => {
  it("names the period", () => {
    expect(statementPeriod({ from: null, to: null }, "en")).toBe("All dates");
    expect(
      statementPeriod({ from: "2026-11-01", to: "2026-11-06" }, "en"),
    ).toBe("1 Nov 2026 to 6 Nov 2026");
    expect(statementPeriod({ from: null, to: "2026-11-06" }, "en")).toBe(
      "Up to 6 Nov 2026",
    );
  });

  it("reads a balance as Dr / Cr", () => {
    expect(statementBalance("0.00", "en")).toEqual({
      amount: "Rs 0.00",
      side: "",
    });
    expect(statementBalance("-5.50", "ur")).toEqual({
      amount: "5.50 روپے",
      side: "جمع",
    });
  });

  it("makes a file name of any script", () => {
    expect(statementFileBase("Rafiq Ahmad")).toBe("khata-rafiq-ahmad");
    expect(statementFileBase("محمد اسلم")).toBe("khata-محمد-اسلم");
    expect(statementFileBase("  ")).toBe("khata");
  });
});
