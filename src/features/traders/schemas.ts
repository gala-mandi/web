import { z } from "zod";
import type { Translator } from "@/i18n/types";
import {
  balanceTypes,
  type CreateTraderInput,
  type Trader,
  type TraderType,
  traderTypes,
  type UpdateTraderInput,
} from "./types";

/** Messages come from the `traders` messages of the interface language. */
export type TradersTranslator = Translator<"traders">;

// Same rules as the server's DTO; money stays a string.
const MONEY = /^\d{1,12}(\.\d{1,2})?$/;
const PHONE = /^[+\d][\d\s-]{6,19}$/;
const CNIC = /^\d{5}-?\d{7}-?\d$/;

const text = (t: TradersTranslator, max: number) =>
  z
    .string()
    .trim()
    .max(max, t("errors.tooLong", { max: max }));
/** "" = not set. */
const optional = (regex: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || regex.test(v), message);

export const traderFormSchema = (t: TradersTranslator) =>
  z.object({
    type: z.enum(traderTypes, { error: t("errors.typeRequired") }),
    name: z
      .string()
      .trim()
      .min(2, t("errors.nameRequired"))
      .max(120, t("errors.tooLong", { max: 120 })),
    fatherName: text(t, 120),
    phone: z
      .string()
      .trim()
      .refine(
        // At least 7 digits: "+------" would otherwise pass.
        (v) => v === "" || (PHONE.test(v) && v.replace(/\D/g, "").length >= 7),
        t("errors.phoneInvalid"),
      ),
    cnic: optional(CNIC, t("errors.cnicInvalid")),
    village: text(t, 80),
    address: text(t, 500),
    openingBalance: optional(MONEY, t("errors.money")),
    openingBalanceType: z.enum(balanceTypes),
    creditLimit: optional(MONEY, t("errors.money")),
    notes: text(t, 1000),
    isActive: z.boolean(),
  });

/** Form values: strings ("" = not set) plus the active flag. */
export type TraderFormValues = z.infer<ReturnType<typeof traderFormSchema>>;
export type TraderField = keyof TraderFormValues;

/** Form fields the server may report errors on. */
export const traderFields = [
  "type",
  "name",
  "fatherName",
  "phone",
  "cnic",
  "village",
  "address",
  "openingBalance",
  "openingBalanceType",
  "creditLimit",
  "notes",
  "isActive",
] as const satisfies readonly TraderField[];

/** Optional text fields the server stores as null when empty. */
const nullableFields = [
  "fatherName",
  "phone",
  "cnic",
  "village",
  "address",
  "creditLimit",
  "notes",
] as const satisfies readonly TraderField[];

/** An empty form; `prefill` e.g. from the picker's typed name or the open tab. */
export function emptyTraderValues(
  prefill: { name?: string; type?: TraderType } = {},
): TraderFormValues {
  return {
    type: prefill.type ?? "kissan",
    name: prefill.name?.trim() ?? "",
    fatherName: "",
    phone: "",
    cnic: "",
    village: "",
    address: "",
    openingBalance: "",
    openingBalanceType: "debit",
    creditLimit: "",
    notes: "",
    isActive: true,
  };
}

/** Server trader → form values ("" for null). */
export function toTraderFormValues(trader: Trader): TraderFormValues {
  return {
    type: trader.type,
    name: trader.name,
    fatherName: trader.fatherName ?? "",
    phone: trader.phone ?? "",
    cnic: trader.cnic ?? "",
    village: trader.village ?? "",
    address: trader.address ?? "",
    openingBalance: trader.openingBalance,
    openingBalanceType: trader.openingBalanceType,
    creditLimit: trader.creditLimit ?? "",
    notes: trader.notes ?? "",
    isActive: trader.isActive,
  };
}

/** One field as the API wants it: trimmed, "" → null, no opening balance → "0". */
function apiValue(values: TraderFormValues, field: TraderField) {
  const value = values[field];
  if (typeof value === "boolean") return value;
  const trimmed = value.trim();
  if (field === "openingBalance") return trimmed || "0";
  if ((nullableFields as readonly string[]).includes(field)) {
    return trimmed === "" ? null : trimmed;
  }
  return trimmed;
}

/** `POST /traders` body: every field ("" → null); new traders are active. */
export function toCreateInput(values: TraderFormValues): CreateTraderInput {
  const input: Record<string, unknown> = {};
  for (const field of traderFields) {
    if (field === "isActive") continue;
    input[field] = apiValue(values, field);
  }
  return input as unknown as CreateTraderInput;
}

/** `PATCH /traders/:id` body: only the fields the user changed. */
export function toUpdateInput(
  values: TraderFormValues,
  dirty: Partial<Record<TraderField, unknown>>,
): UpdateTraderInput {
  const input: Record<string, unknown> = {};
  for (const field of traderFields) {
    if (dirty[field]) input[field] = apiValue(values, field);
  }
  return input as UpdateTraderInput;
}
