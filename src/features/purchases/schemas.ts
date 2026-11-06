import Decimal from "decimal.js";
import { z } from "zod";
import type { CommodityLookupItem } from "@/features/commodities/types";
import type { TraderLookupItem } from "@/features/traders/types";
import { RATE_UNITS } from "@/lib/charges/calculate-transaction";
import { maundToKg } from "@/lib/units";
import { purchaseText } from "./text";
import type {
  CreatePurchaseInput,
  Purchase,
  PurchaseItemInput,
  RateUnit,
} from "./types";

const e = purchaseText.errors;

/** Most items one parchi may carry (server `MAX_ITEMS`). */
export const MAX_ITEMS = 100;
const MAX_BAGS = 1_000_000;
const MAX_NOTES = 1000;

/** A weight is typed in maund or kg; it is always sent in kg. */
export const weightUnits = ["maund", "kg"] as const;
export type WeightUnit = (typeof weightUnits)[number];

// Same limits as the server's DTO: numeric(14,2) money, numeric(12,3) kg.
const MONEY = /^\d{1,12}(\.\d{1,2})?$/;
const KG = /^\d{1,9}(\.\d{1,3})?$/;
const MAUND = /^\d{1,8}(\.\d{1,6})?$/;
const BAGS = /^\d{1,7}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const hasDigit = (v: string) => /[1-9]/.test(v);

export interface PurchaseItemFormValues {
  /** The lookup item: carries the charges that apply and the default unit. */
  commodity: CommodityLookupItem | null;
  /** Whole bags, or "" when not counted. */
  bags: string;
  /** As typed, in `weightUnit`. */
  weight: string;
  weightUnit: WeightUnit;
  /** Rupees per `rateUnit`, as typed. */
  rate: string;
  rateUnit: RateUnit;
}

export interface PurchaseFormValues {
  /** YYYY-MM-DD, Asia/Karachi. */
  purchaseDate: string;
  trader: TraderLookupItem | null;
  notes: string;
  items: PurchaseItemFormValues[];
}

export function emptyItem(
  weightUnit: WeightUnit = "maund",
): PurchaseItemFormValues {
  return {
    commodity: null,
    bags: "",
    weight: "",
    weightUnit,
    rate: "",
    rateUnit: "maund",
  };
}

export function emptyPurchaseValues(today: string): PurchaseFormValues {
  return { purchaseDate: today, trader: null, notes: "", items: [emptyItem()] };
}

/** A row nothing was typed in (e.g. the one Enter added): not sent. */
export function isBlankItem(item: PurchaseItemFormValues): boolean {
  return (
    !item.commodity &&
    !item.bags.trim() &&
    !item.weight.trim() &&
    !item.rate.trim()
  );
}

/** The typed weight in kg (3 decimals), or null while it isn't valid. */
export function itemWeightKg(item: PurchaseItemFormValues): string | null {
  const value = item.weight.trim();
  if (item.weightUnit === "kg") {
    return KG.test(value) && hasDigit(value)
      ? new Decimal(value).toFixed(3)
      : null;
  }
  if (!MAUND.test(value) || !hasDigit(value)) return null;
  const kg = maundToKg(value);
  return kg && KG.test(kg) && hasDigit(kg) ? kg : null;
}

function bagsOf(item: PurchaseItemFormValues): number | null {
  const value = item.bags.trim();
  return BAGS.test(value) ? Number(value) : null;
}

/** Errors of one row, by field; empty for a blank or valid row. */
function itemIssues(item: PurchaseItemFormValues) {
  const issues: { field: keyof PurchaseItemFormValues; message: string }[] = [];
  if (isBlankItem(item)) return issues;
  const add = (field: keyof PurchaseItemFormValues, message: string) =>
    issues.push({ field, message });

  if (!item.commodity) add("commodity", e.commodityRequired);

  const bags = item.bags.trim();
  if (bags && !BAGS.test(bags)) add("bags", e.bags);
  else if (bags && Number(bags) > MAX_BAGS) add("bags", e.bagsTooMany);
  else if (item.rateUnit === "bag" && !hasDigit(bags)) {
    add("bags", e.bagsForBagRate);
  }

  const weight = item.weight.trim();
  if (!weight) add("weight", e.weightRequired);
  else if (!(item.weightUnit === "kg" ? KG : MAUND).test(weight)) {
    add("weight", item.weightUnit === "kg" ? e.weightKg : e.weightMaund);
  } else if (!hasDigit(weight)) add("weight", e.weightZero);
  else if (!itemWeightKg(item)) add("weight", e.weightTooLarge);

  const rate = item.rate.trim();
  if (!rate) add("rate", e.rateRequired);
  else if (!MONEY.test(rate)) add("rate", e.rate);
  else if (!hasDigit(rate)) add("rate", e.rateZero);
  return issues;
}

/** True when a row can go into the live total. */
export function isCompleteItem(item: PurchaseItemFormValues): boolean {
  return !isBlankItem(item) && itemIssues(item).length === 0;
}

const itemSchema = z
  .object({
    commodity: z.custom<CommodityLookupItem | null>(),
    bags: z.string(),
    weight: z.string(),
    weightUnit: z.enum(weightUnits),
    rate: z.string(),
    rateUnit: z.enum(RATE_UNITS),
  })
  .superRefine((item, ctx) => {
    for (const { field, message } of itemIssues(item)) {
      ctx.addIssue({ code: "custom", path: [field], message });
    }
  });

/** The form's schema; `today` (Asia/Karachi) is the latest date allowed. */
export function purchaseFormSchema(today: string) {
  return z.object({
    purchaseDate: z
      .string()
      .trim()
      .regex(DATE, e.dateRequired)
      .refine((v) => v <= today, e.dateInFuture),
    trader: z
      .custom<TraderLookupItem | null>()
      .refine(Boolean, e.traderRequired),
    notes: z.string().max(MAX_NOTES, e.notesTooLong),
    items: z
      .array(itemSchema)
      .refine(
        (items) => items.some((item) => !isBlankItem(item)),
        e.itemsRequired,
      )
      .refine(
        (items) =>
          items.filter((item) => !isBlankItem(item)).length <= MAX_ITEMS,
        e.tooManyItems,
      ),
  });
}

export function toItemInput(item: PurchaseItemFormValues): PurchaseItemInput {
  return {
    commodityId: item.commodity?.id ?? "",
    bags: bagsOf(item),
    weightKg: itemWeightKg(item) ?? "",
    rate: item.rate.trim(),
    rateUnit: item.rateUnit,
  };
}

/**
 * The request body, without blank rows. `rowIndexes[i]` is the form row of
 * the i-th item sent, so `items.1.weightKg` from the server lands on its row.
 */
export function toPurchaseInput(values: PurchaseFormValues): {
  input: CreatePurchaseInput;
  rowIndexes: number[];
} {
  const rowIndexes: number[] = [];
  const items: PurchaseItemInput[] = [];
  values.items.forEach((item, index) => {
    if (isBlankItem(item)) return;
    rowIndexes.push(index);
    items.push(toItemInput(item));
  });
  const notes = values.notes.trim();
  return {
    input: {
      traderId: values.trader?.id ?? "",
      purchaseDate: values.purchaseDate,
      items,
      notes: notes || null,
    },
    rowIndexes,
  };
}

/** Server item field → form item field. */
const itemFields: Record<string, keyof PurchaseItemFormValues> = {
  commodityId: "commodity",
  bags: "bags",
  weightKg: "weight",
  rate: "rate",
  rateUnit: "rateUnit",
};

/** Server field → form field. */
const headerFields: Record<string, "trader" | "purchaseDate" | "notes"> = {
  traderId: "trader",
  purchaseDate: "purchaseDate",
  notes: "notes",
};

/**
 * Where a server field error goes: `traderId` → `trader`, `items.1.weightKg`
 * → `items.<form row>.weight`, `items.1` (the whole item) → its rate, `items`
 * → the items list. Null for errors no field shows (they go in the alert).
 */
export function toFormField(
  field: string,
  rowIndexes: readonly number[],
): string | null {
  if (headerFields[field]) return headerFields[field];
  if (field === "items") return "items";
  const match = /^items\.(\d+)(?:\.(\w+))?$/.exec(field);
  if (!match) return null;
  const row = rowIndexes[Number(match[1])];
  if (row === undefined) return null;
  // "charges are more than the gross amount" is about the whole item.
  const name = match[2] ? itemFields[match[2]] : "rate";
  return name ? `items.${row}.${name}` : null;
}

/** "1000.000" → "1000", "12.500" → "12.5": a stored decimal as typed. */
function trimDecimal(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/**
 * A saved purchase as form values (edit). Weights open in kg, as stored, so
 * nothing is rounded; each item's commodity carries `charges` for the live
 * total (see `editCharges`).
 */
export function toPurchaseFormValues(
  purchase: Purchase,
  charges: CommodityLookupItem["charges"],
): PurchaseFormValues {
  return {
    purchaseDate: purchase.purchaseDate,
    trader: {
      id: purchase.trader.id,
      type: "kissan",
      name: purchase.trader.name,
      fatherName: null,
      phone: null,
      village: null,
    },
    notes: purchase.notes ?? "",
    items: purchase.items.map((item) => ({
      commodity: {
        id: item.commodityId,
        name: item.commodityName,
        nameUr: null,
        defaultUnit: item.rateUnit,
        bagWeightKg: null,
        charges,
      },
      bags: item.bags === null ? "" : String(item.bags),
      weight: trimDecimal(item.weightKg),
      weightUnit: "kg",
      rate: trimDecimal(item.rate),
      rateUnit: item.rateUnit,
    })),
  };
}
