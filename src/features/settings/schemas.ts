import { z } from "zod";
import { normalizePhone } from "@/features/auth/schemas";
import type { Translator } from "@/i18n/types";
import type { Settings, UpdateSettingsInput } from "./types";

/** Error messages come from the `settings` messages of the interface language. */
export type SettingsTranslator = Translator<"settings">;

export const units = ["kg", "maund", "bag"] as const;
export const languages = ["en", "ur"] as const;

// Same rules as the server; decimals stay strings.
const percent = (t: SettingsTranslator) =>
  z
    .string()
    .trim()
    .regex(/^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/, t("errors.percent"));
const optional = (t: SettingsTranslator, max: number) =>
  z
    .string()
    .trim()
    .max(max, t("errors.tooLong", { max: max }));

export const settingsSchema = (t: SettingsTranslator) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t("errors.nameRequired"))
      .max(120, t("errors.tooLong", { max: 120 })),
    phone: z
      .string()
      .trim()
      .min(1, t("errors.phoneRequired"))
      .refine((v) => normalizePhone(v) !== null, t("errors.phoneInvalid")),
    email: z.union([z.literal(""), z.email(t("errors.emailInvalid")).max(160)]),
    city: optional(t, 80),
    address: optional(t, 500),
    displayName: optional(t, 120),
    parchiFooter: optional(t, 500),
    defaultCommissionPct: percent(t),
    marketFeePct: percent(t),
    labourPerBag: z
      .string()
      .trim()
      .regex(/^\d{1,12}(\.\d{1,2})?$/, t("errors.money")),
    defaultUnit: z.enum(units),
    maundKg: z
      .string()
      .trim()
      .regex(/^\d{1,3}(\.\d{1,3})?$/, t("errors.maundKg"))
      .refine((v) => /[1-9]/.test(v), t("errors.maundKg")),
    language: z.enum(languages),
    billPrefix: z
      .string()
      .trim()
      .max(10, t("errors.tooLong", { max: 10 }))
      .regex(/^[A-Za-z0-9/-]*$/, t("errors.billPrefix")),
    financialYearStart: z.union([z.literal(""), z.iso.date(t("errors.date"))]),
  });

export type SettingsValues = z.infer<ReturnType<typeof settingsSchema>>;
export type SettingsField = keyof SettingsValues;

/** Form fields the server may report errors on. */
export const settingsFields = [
  "name",
  "phone",
  "email",
  "city",
  "address",
  "displayName",
  "parchiFooter",
  "defaultCommissionPct",
  "marketFeePct",
  "labourPerBag",
  "defaultUnit",
  "maundKg",
  "language",
  "billPrefix",
  "financialYearStart",
] as const satisfies readonly SettingsField[];

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
