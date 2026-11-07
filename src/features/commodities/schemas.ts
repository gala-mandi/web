import { z } from "zod";
import { units } from "@/features/settings/schemas";
import type { Translator } from "@/i18n/types";
import type {
  Commodity,
  CreateCommodityInput,
  UpdateCommodityInput,
} from "./types";

/** Messages come from the `commodities` messages of the interface language. */
export type CommoditiesTranslator = Translator<"commodities">;

// Same rules as the server's DTO; decimals stay strings.
const PERCENT = /^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/;
const MONEY = /^\d{1,12}(\.\d{1,2})?$/;
// numeric(8,3): up to 99999.999 kg.
const BAG_WEIGHT = /^\d{1,5}(\.\d{1,3})?$/;

const text = (t: CommoditiesTranslator, max: number) =>
  z
    .string()
    .trim()
    .max(max, t("errors.tooLong", { max: max }));
/** "" = not set (for a charge: the shop default applies). */
const optional = (regex: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || regex.test(v), message);

export const commodityFormSchema = (t: CommoditiesTranslator) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t("errors.nameRequired"))
      .max(80, t("errors.tooLong", { max: 80 })),
    nameUr: text(t, 80),
    category: text(t, 40),
    defaultUnit: z.enum(units, { error: t("errors.unitRequired") }),
    bagWeightKg: optional(BAG_WEIGHT, t("errors.bagWeight")).refine(
      // One message per problem: "0" is well-formed but not more than 0.
      (v) => v === "" || !BAG_WEIGHT.test(v) || /[1-9]/.test(v),
      t("errors.bagWeightZero"),
    ),
    commissionPct: optional(PERCENT, t("errors.percent")),
    marketFeePct: optional(PERCENT, t("errors.percent")),
    labourPerBag: optional(MONEY, t("errors.money")),
    isActive: z.boolean(),
  });

/** Form values: strings ("" = not set) plus the active flag. */
export type CommodityFormValues = z.infer<
  ReturnType<typeof commodityFormSchema>
>;
export type CommodityField = keyof CommodityFormValues;

/** Form fields the server may report errors on. */
export const commodityFields = [
  "name",
  "nameUr",
  "category",
  "defaultUnit",
  "bagWeightKg",
  "commissionPct",
  "marketFeePct",
  "labourPerBag",
  "isActive",
] as const satisfies readonly CommodityField[];

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
