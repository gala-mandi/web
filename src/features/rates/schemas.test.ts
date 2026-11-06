import { describe, expect, it } from "vitest";
import {
  copyRates,
  gridCommodities,
  type RateRowValues,
  ratesFormSchema,
  toFormField,
  toRatesFormValues,
  toSaveInput,
} from "./schemas";
import { rateText } from "./text";
import { gandum, kapas, makai, rate } from "./test-data";

const e = rateText.errors;

const row = (over: Partial<RateRowValues> = {}): RateRowValues => ({
  commodityId: gandum.id,
  minRate: "",
  maxRate: "",
  avgRate: "",
  rateUnit: "maund",
  saved: false,
  ...over,
});

/** "path → message" of every error. */
function errorsOf(rows: RateRowValues[]) {
  const result = ratesFormSchema.safeParse({ rows });
  return result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".")} → ${i.message}`);
}

describe("ratesFormSchema", () => {
  it("an empty row is skipped; min and max are enough", () => {
    expect(
      errorsOf([row(), row({ minRate: "4000", maxRate: "4200.5" })]),
    ).toEqual([]);
  });

  it("a half-filled row needs both min and max", () => {
    expect(errorsOf([row({ minRate: "4000" })])).toEqual([
      `rows.0.maxRate → ${e.maxRequired}`,
    ]);
    expect(errorsOf([row({ avgRate: "4100" })])).toEqual([
      `rows.0.minRate → ${e.minRequired}`,
      `rows.0.maxRate → ${e.maxRequired}`,
    ]);
  });

  it("max below min is an error on max, compared as decimals", () => {
    expect(errorsOf([row({ minRate: "900.50", maxRate: "900.5" })])).toEqual(
      [],
    );
    expect(errorsOf([row({ minRate: "1000", maxRate: "999.99" })])).toEqual([
      `rows.0.maxRate → ${e.maxBelowMin}`,
    ]);
  });

  it("rupees with up to 2 decimals, no signs or letters", () => {
    expect(
      errorsOf([row({ minRate: "-1", maxRate: "4200.555", avgRate: "abc" })]),
    ).toEqual([
      `rows.0.minRate → ${e.money}`,
      `rows.0.maxRate → ${e.money}`,
      `rows.0.avgRate → ${e.money}`,
    ]);
  });

  it("a saved rate can't be emptied (the API has no delete)", () => {
    expect(errorsOf([row({ saved: true })])).toEqual([
      `rows.0.minRate → ${e.cannotClear}`,
    ]);
  });
});

describe("form values", () => {
  it("one row per commodity, with the saved rate or empty", () => {
    const values = toRatesFormValues(
      [gandum, kapas, makai],
      [rate({ commodityId: kapas.id, avgRate: "4100.00", rateUnit: "kg" })],
    );
    expect(values.rows).toEqual([
      row(),
      row({
        commodityId: kapas.id,
        minRate: "4000.00",
        maxRate: "4200.00",
        avgRate: "4100.00",
        rateUnit: "kg",
        saved: true,
      }),
      // Counted in kg → priced per kg.
      row({ commodityId: makai.id, rateUnit: "kg" }),
    ]);
  });

  it("the grid lists active commodities and inactive ones with a rate", () => {
    const old = { ...kapas, isActive: false };
    const gone = { ...makai, isActive: false };
    expect(
      gridCommodities([old, gone, gandum], [rate({ commodityId: old.id })]),
    ).toEqual([gandum, old]);
  });

  it("only filled rows are sent; their grid rows map errors back", () => {
    const { input, rowIndexes } = toSaveInput({
      rows: [
        row(),
        row({ commodityId: kapas.id, minRate: " 4000 ", maxRate: "4200" }),
        row({
          commodityId: makai.id,
          minRate: "50",
          maxRate: "55",
          avgRate: "52.5",
          rateUnit: "kg",
        }),
      ],
    });
    expect(input).toEqual({
      rates: [
        {
          commodityId: kapas.id,
          minRate: "4000",
          maxRate: "4200",
          avgRate: null,
          rateUnit: "maund",
        },
        {
          commodityId: makai.id,
          minRate: "50",
          maxRate: "55",
          avgRate: "52.5",
          rateUnit: "kg",
        },
      ],
    });
    expect(rowIndexes).toEqual([1, 2]);
    expect(toFormField("rates.1.maxRate", rowIndexes)).toBe("rows.2.maxRate");
    expect(toFormField("rates.0.commodityId", rowIndexes)).toBeNull();
    expect(toFormField("rates.5.minRate", rowIndexes)).toBeNull();
  });
});

describe("copyRates", () => {
  it("fills only the empty rows that had a rate the day before", () => {
    const rows = [
      row(),
      row({ commodityId: kapas.id, minRate: "10", maxRate: "12" }),
      row({ commodityId: makai.id }),
    ];
    const copied = copyRates(rows, [
      rate({ avgRate: "4100.00" }),
      rate({ commodityId: kapas.id }),
    ]);
    expect(copied).toEqual([
      {
        index: 0,
        row: row({
          minRate: "4000.00",
          maxRate: "4200.00",
          avgRate: "4100.00",
        }),
      },
    ]);
  });
});
