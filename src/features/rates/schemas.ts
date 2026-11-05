import { z } from "zod";
import type { Commodity } from "@/features/commodities/types";
import { rateText } from "./text";
import {
  type Rate,
  type RateInput,
  type RateUnit,
  rateUnits,
  type SaveRatesInput,
} from "./types";
import { compareMoney, MONEY } from "./values";

const e = rateText.errors;

/** The rate cells of a row, in the order Tab/Enter walks through them. */
export const rateFields = ["minRate", "maxRate", "avgRate"] as const;
export type RateField = (typeof rateFields)[number];

/** "" or a rupee string with up to 2 decimals. */
const money = z
  .string()
  .trim()
  .refine((v) => v === "" || MONEY.test(v), e.money);

/**
 * One commodity's row. All three cells empty = skip the commodity (unless it
 * already has a saved rate: the API can't remove one). Otherwise min and max
 * are needed, avg is optional, and max must be at least min, as the server
 * checks.
 */
export const rateRowSchema = z
  .object({
    commodityId: z.string(),
    minRate: money,
    maxRate: money,
    avgRate: money,
    rateUnit: z.enum(rateUnits),
    /** The day already has a rate for this commodity. */
    saved: z.boolean(),
  })
  .superRefine((row, ctx) => {
    const { minRate, maxRate, avgRate } = row;
    if (minRate === "" && maxRate === "" && avgRate === "") {
      if (row.saved) {
        ctx.addIssue({
          code: "custom",
          message: e.cannotClear,
          path: ["minRate"],
        });
      }
      return;
    }
    if (minRate === "") {
      ctx.addIssue({
        code: "custom",
        message: e.minRequired,
        path: ["minRate"],
      });
    }
    if (maxRate === "") {
      ctx.addIssue({
        code: "custom",
        message: e.maxRequired,
        path: ["maxRate"],
      });
    }
    // Only when both are well-formed; otherwise their own message shows.
    if (
      MONEY.test(minRate) &&
      MONEY.test(maxRate) &&
      compareMoney(minRate, maxRate) > 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: e.maxBelowMin,
        path: ["maxRate"],
      });
    }
  });

export const ratesFormSchema = z.object({ rows: z.array(rateRowSchema) });

export type RateRowValues = z.infer<typeof rateRowSchema>;
export type RatesFormValues = z.infer<typeof ratesFormSchema>;

/** A commodity counted in kg is priced per kg; everything else per maund. */
function defaultRateUnit(commodity: Commodity): RateUnit {
  return commodity.defaultUnit === "kg" ? "kg" : "maund";
}

/**
 * The grid's commodities: every active one, plus an inactive one that has a
 * rate on the day (so a saved rate never disappears), in name order.
 */
export function gridCommodities(
  commodities: Commodity[],
  rates: Rate[],
): Commodity[] {
  const rated = new Set(rates.map((r) => r.commodityId));
  return commodities
    .filter((c) => c.isActive || rated.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Server rates → one form row per commodity ("" where no rate is saved). */
export function toRatesFormValues(
  commodities: Commodity[],
  rates: Rate[],
): RatesFormValues {
  const byCommodity = new Map(rates.map((r) => [r.commodityId, r]));
  return {
    rows: commodities.map((commodity) => {
      const rate = byCommodity.get(commodity.id);
      return {
        commodityId: commodity.id,
        minRate: rate?.minRate ?? "",
        maxRate: rate?.maxRate ?? "",
        avgRate: rate?.avgRate ?? "",
        rateUnit: rate?.rateUnit ?? defaultRateUnit(commodity),
        saved: Boolean(rate),
      };
    }),
  };
}

const isEmpty = (row: RateRowValues) =>
  row.minRate.trim() === "" &&
  row.maxRate.trim() === "" &&
  row.avgRate.trim() === "";

/**
 * Fills the empty rows with the day before's rates. Rows the user already
 * typed in, or that are saved, stay as they are. Returns the indexes filled.
 */
export function copyRates(
  rows: RateRowValues[],
  previous: Rate[],
): { index: number; row: RateRowValues }[] {
  const byCommodity = new Map(previous.map((r) => [r.commodityId, r]));
  return rows.flatMap((row, index) => {
    const rate = byCommodity.get(row.commodityId);
    if (!rate || !isEmpty(row)) return [];
    return [
      {
        index,
        row: {
          ...row,
          minRate: rate.minRate,
          maxRate: rate.maxRate,
          avgRate: rate.avgRate ?? "",
          rateUnit: rate.rateUnit,
        },
      },
    ];
  });
}

/**
 * `PUT /rates/:date` body: every filled row (the server adds new ones and
 * updates the rest), plus `rowIndexes[i]` = the grid row of `rates[i]`, to put
 * the server's `rates.<i>.<field>` errors on the right cell.
 */
export function toSaveInput(values: RatesFormValues): {
  input: SaveRatesInput;
  rowIndexes: number[];
} {
  const rates: RateInput[] = [];
  const rowIndexes: number[] = [];
  values.rows.forEach((row, index) => {
    if (isEmpty(row)) return;
    rates.push({
      commodityId: row.commodityId,
      minRate: row.minRate.trim(),
      maxRate: row.maxRate.trim(),
      avgRate: row.avgRate.trim() || null,
      rateUnit: row.rateUnit,
    });
    rowIndexes.push(index);
  });
  return { input: { rates }, rowIndexes };
}

/** Server field "rates.2.maxRate" → form field "rows.<grid row>.maxRate". */
export function toFormField(
  field: string,
  rowIndexes: number[],
): `rows.${number}.${RateField}` | null {
  const match = /^rates\.(\d+)\.(minRate|maxRate|avgRate)$/.exec(field);
  if (!match) return null;
  const row = rowIndexes[Number(match[1])];
  return row === undefined ? null : `rows.${row}.${match[2] as RateField}`;
}
