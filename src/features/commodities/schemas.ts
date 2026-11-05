import { z } from "zod";
import { units } from "@/features/settings/schemas";
import { commodityText } from "./text";
import type {
  Commodity,
  CreateCommodityInput,
  UpdateCommodityInput,
} from "./types";

const e = commodityText.errors;

// Same rules as the server's DTO; decimals stay strings.
const PERCENT = /^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/;
const MONEY = /^\d{1,12}(\.\d{1,2})?$/;
// numeric(8,3): up to 99999.999 kg.
const BAG_WEIGHT = /^\d{1,5}(\.\d{1,3})?$/;

const text = (max: number) => z.string().trim().max(max, e.tooLong(max));
/** "" = not set (for a charge: the shop default applies). */
const optional = (regex: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || regex.test(v), message);

export const commodityFormSchema = z.object({
  name: z.string().trim().min(2, e.nameRequired).max(80, e.tooLong(80)),
  nameUr: text(80),
  category: text(40),
  defaultUnit: z.enum(units, { error: e.unitRequired }),
  bagWeightKg: optional(BAG_WEIGHT, e.bagWeight).refine(
    // One message per problem: "0" is well-formed but not more than 0.
    (v) => v === "" || !BAG_WEIGHT.test(v) || /[1-9]/.test(v),
    e.bagWeightZero,
  ),
  commissionPct: optional(PERCENT, e.percent),
  marketFeePct: optional(PERCENT, e.percent),
  labourPerBag: optional(MONEY, e.money),
  isActive: z.boolean(),
});

/** Form values: strings ("" = not set) plus the active flag. */
export type CommodityFormValues = z.infer<typeof commodityFormSchema>;
export type CommodityField = keyof CommodityFormValues;

/** Form fields the server may report errors on. */
export const commodityFields = Object.keys(
  commodityFormSchema.shape,
) as CommodityField[];

/** An empty form; new commodities are counted in maunds unless changed. */
export function emptyCommodityValues(): CommodityFormValues {
  return {
    name: "",
    nameUr: "",
    category: "",
    defaultUnit: "maund",
    bagWeightKg: "",
    commissionPct: "",
    marketFeePct: "",
    labourPerBag: "",
    isActive: true,
  };
}

/** Server commodity → form values ("" for null). */
export function toCommodityFormValues(
  commodity: Commodity,
): CommodityFormValues {
  return {
    name: commodity.name,
    nameUr: commodity.nameUr ?? "",
    category: commodity.category ?? "",
    defaultUnit: commodity.defaultUnit,
    bagWeightKg: commodity.bagWeightKg ?? "",
    commissionPct: commodity.commissionPct ?? "",
    marketFeePct: commodity.marketFeePct ?? "",
    labourPerBag: commodity.labourPerBag ?? "",
    isActive: commodity.isActive,
  };
}

/**
 * One field as the API wants it: trimmed, "" → null for every optional
 * field. A null charge clears the override, so the shop default applies.
 */
function apiValue(values: CommodityFormValues, field: CommodityField) {
  const value = values[field];
  if (typeof value === "boolean") return value;
  const trimmed = value.trim();
  if (field === "name" || field === "defaultUnit") return trimmed;
  return trimmed === "" ? null : trimmed;
}

/** `POST /commodities` body: every field ("" → null); new ones are active. */
export function toCreateInput(
  values: CommodityFormValues,
): CreateCommodityInput {
  const input: Record<string, unknown> = {};
  for (const field of commodityFields) {
    if (field === "isActive") continue;
    input[field] = apiValue(values, field);
  }
  return input as unknown as CreateCommodityInput;
}

/** `PATCH /commodities/:id` body: only the fields the user changed. */
export function toUpdateInput(
  values: CommodityFormValues,
  dirty: Partial<Record<CommodityField, unknown>>,
): UpdateCommodityInput {
  const input: Record<string, unknown> = {};
  for (const field of commodityFields) {
    if (dirty[field]) input[field] = apiValue(values, field);
  }
  return input as UpdateCommodityInput;
}
