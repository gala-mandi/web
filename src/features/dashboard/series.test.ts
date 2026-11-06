import { describe, expect, it } from "vitest";
import {
  barShare,
  dailySeries,
  isEmptyShop,
  isZeroAmount,
  topCommodities,
  trendFrom,
} from "./series";
import {
  CLOSED_DAYS,
  commodityIds,
  dailySummary,
  emptyShop,
  FROM,
  outstanding,
  purchasesByCommodity,
  purchasesByDay,
  salesByDay,
  TODAY,
} from "./test-data";

describe("trendFrom", () => {
  it("starts 29 days before today, so the period is 30 days", () => {
    expect(trendFrom(TODAY)).toBe(FROM);
    expect(trendFrom("2026-03-01")).toBe("2026-01-31");
  });
});

describe("dailySeries", () => {
  const series = dailySeries(purchasesByDay, salesByDay, FROM, TODAY);

  it("has one point per day, oldest first", () => {
    expect(series).toHaveLength(30);
    expect(series[0].date).toBe(FROM);
    expect(series.at(-1)?.date).toBe(TODAY);
  });

  it("fills days without bills with zero", () => {
    for (const date of CLOSED_DAYS) {
      expect(series.find((p) => p.date === date)).toEqual({
        date,
        purchases: "0.00",
        sales: "0.00",
        purchaseBills: 0,
        saleBills: 0,
        purchasesY: 0,
        salesY: 0,
      });
    }
  });

  it("keeps the server's amount strings as they are", () => {
    const row = purchasesByDay.rows.find((r) => r.key === TODAY)!;
    const point = series.at(-1)!;
    expect(point.purchases).toBe(row.netAmount);
    expect(point.purchaseBills).toBe(row.bills);
    expect(point.purchasesY).toBe(Number(row.netAmount));
  });

  it("is all zeros before the reports load", () => {
    const empty = dailySeries(undefined, undefined, "2026-11-01", TODAY);
    expect(empty).toHaveLength(6);
    expect(empty.every((p) => p.purchases === "0.00" && p.salesY === 0)).toBe(
      true,
    );
  });
});

describe("topCommodities", () => {
  it("ranks by weight as decimals, heaviest first", () => {
    expect(topCommodities(purchasesByCommodity)).toEqual([
      { id: commodityIds.wheat, name: "Gandum" },
      { id: commodityIds.rice, name: "Chawal (Basmati)" },
      { id: commodityIds.maize, name: "Makai" },
    ]);
  });

  it("compares long weights exactly and breaks ties by name", () => {
    const row = (key: string, label: string, weightKg: string) => ({
      key,
      label,
      weightKg,
      bills: 1,
      bags: 1,
      grossAmount: "1.00",
      netAmount: null,
    });
    const report = {
      ...purchasesByCommodity,
      rows: [
        row("a", "Bajra", "9007199254740993.001"),
        row("b", "Arhar", "9007199254740993.001"),
        row("c", "Chana", "9007199254740993.000"),
      ],
    };
    expect(topCommodities(report, 3).map((c) => c.name)).toEqual([
      "Arhar",
      "Bajra",
      "Chana",
    ]);
  });

  it("is empty without a report or rows", () => {
    expect(topCommodities(undefined)).toEqual([]);
    expect(topCommodities(emptyShop.byCommodity)).toEqual([]);
  });
});

describe("isZeroAmount", () => {
  it.each(["0", "0.00", "-0.00", "0.000", " 0.00 "])("%s is zero", (v) =>
    expect(isZeroAmount(v)).toBe(true),
  );
  it.each(["0.01", "-5.00", "100"])("%s is not", (v) =>
    expect(isZeroAmount(v)).toBe(false),
  );
});

describe("isEmptyShop", () => {
  it("is true when every report is zeros and empty lists", () => {
    expect(
      isEmptyShop(
        emptyShop.summary,
        emptyShop.book,
        emptyShop.book,
        emptyShop.outstanding,
      ),
    ).toBe(true);
  });

  it("is false as soon as anything exists", () => {
    expect(
      isEmptyShop(dailySummary, purchasesByDay, salesByDay, outstanding),
    ).toBe(false);
    expect(
      isEmptyShop(
        emptyShop.summary,
        emptyShop.book,
        emptyShop.book,
        outstanding,
      ),
    ).toBe(false);
    expect(
      isEmptyShop(
        {
          ...emptyShop.summary,
          cash: { ...emptyShop.summary.cash, closingCash: "500.00" },
        },
        emptyShop.book,
        emptyShop.book,
        emptyShop.outstanding,
      ),
    ).toBe(false);
  });
});

describe("barShare", () => {
  it("is the share of the largest amount, between 0 and 1", () => {
    expect(barShare("500.00", "1000.00")).toBe(0.5);
    expect(barShare("1000.00", "1000.00")).toBe(1);
    expect(barShare("10.00", "0.00")).toBe(0);
    expect(barShare("x", "100.00")).toBe(0);
  });
});
