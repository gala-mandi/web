import { z } from "zod";
import { normalizePhone } from "@/features/auth/schemas";
import { settingsText } from "./text";
import type { Settings, UpdateSettingsInput } from "./types";

const e = settingsText.errors;

export const units = ["kg", "maund", "bag"] as const;
export const languages = ["en", "ur"] as const;

// Same rules as the server; decimals stay strings.
const percent = z
  .string()
  .trim()
  .regex(/^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/, e.percent);
const optional = (max: number) => z.string().trim().max(max, e.tooLong(max));

export const settingsSchema = z.object({
  name: z.string().trim().min(2, e.nameRequired).max(120, e.tooLong(120)),
  phone: z
    .string()
    .trim()
    .min(1, e.phoneRequired)
    .refine((v) => normalizePhone(v) !== null, e.phoneInvalid),
  email: z.union([z.literal(""), z.email(e.emailInvalid).max(160)]),
  city: optional(80),
  address: optional(500),
  displayName: optional(120),
  parchiFooter: optional(500),
  defaultCommissionPct: percent,
  marketFeePct: percent,
  labourPerBag: z
    .string()
    .trim()
    .regex(/^\d{1,12}(\.\d{1,2})?$/, e.money),
  defaultUnit: z.enum(units),
  maundKg: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,3})?$/, e.maundKg)
    .refine((v) => /[1-9]/.test(v), e.maundKg),
  language: z.enum(languages),
  billPrefix: z
    .string()
    .trim()
    .max(10, e.tooLong(10))
    .regex(/^[A-Za-z0-9/-]*$/, e.billPrefix),
  financialYearStart: z.union([z.literal(""), z.iso.date(e.date)]),
});

export type SettingsValues = z.infer<typeof settingsSchema>;
export type SettingsField = keyof SettingsValues;

/** Form fields the server may report errors on. */
export const settingsFields = Object.keys(
  settingsSchema.shape,
) as SettingsField[];

const nullable = new Set<SettingsField>([
  "email",
  "city",
  "address",
  "displayName",
  "parchiFooter",
  "billPrefix",
  "financialYearStart",
]);

/** Server values → form values (empty string for "not set"). */
export function toFormValues(s: Settings): SettingsValues {
  return {
    name: s.name,
    phone: s.phone,
    email: s.email ?? "",
    city: s.city ?? "",
    address: s.address ?? "",
    displayName: s.displayName ?? "",
    parchiFooter: s.parchiFooter ?? "",
    defaultCommissionPct: s.defaultCommissionPct,
    marketFeePct: s.marketFeePct,
    labourPerBag: s.labourPerBag,
    defaultUnit: s.defaultUnit,
    maundKg: s.maundKg,
    language: s.language,
    billPrefix: s.billPrefix ?? "",
    financialYearStart: s.financialYearStart ?? "",
  };
}

/** Only the changed fields, with "" sent as null. */
export function toUpdateInput(
  values: SettingsValues,
  dirty: Partial<Record<SettingsField, unknown>>,
): UpdateSettingsInput {
  const input: Record<string, string | null> = {};
  for (const field of settingsFields) {
    if (!dirty[field]) continue;
    let value: string | null = values[field].trim();
    if (field === "phone") value = normalizePhone(value) ?? value;
    if (value === "" && nullable.has(field)) value = null;
    input[field] = value;
  }
  return input as UpdateSettingsInput;
}

/** `MND-0001`, or `0001` without a prefix. Example only: the server numbers bills. */
export function sampleBillNumber(prefix: string): string {
  const p = prefix.trim();
  return p ? `${p}-0001` : "0001";
}
