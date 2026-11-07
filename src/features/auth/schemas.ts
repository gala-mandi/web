import { z } from "zod";
import type { Translator } from "@/i18n/types";

/** Error messages come from the `auth` messages of the interface language. */
export type AuthTranslator = Translator<"auth">;

/**
 * Phone numbers are sent in the local 11-digit form the accounts use
 * (`03001234567`). Accepts `300 1234567`, `0300-1234567`, `+92 300 1234567`.
 * Returns null when the input is not a Pakistani mobile number.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("92") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("3") && digits.length === 10) digits = `0${digits}`;
  return /^03\d{9}$/.test(digits) ? digits : null;
}

/** Emails are sent as typed (trimmed); phone numbers in the local form. */
export function normalizeIdentifier(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("@")) return trimmed;
  return normalizePhone(trimmed) ?? trimmed;
}

/** `03001234567` → `0300 •••• 567`, emails → `o•••@shop.pk`. */
export function maskIdentifier(identifier: string): string {
  const value = identifier.trim();
  const at = value.indexOf("@");
  if (at > 0) return `${value[0]}•••${value.slice(at)}`;
  const phone = normalizePhone(value);
  if (phone) return `${phone.slice(0, 4)} •••• ${phone.slice(-3)}`;
  return value;
}

export const loginSchema = (t: AuthTranslator) =>
  z.object({
    identifier: z
      .string()
      .trim()
      .min(1, t("login.errors.identifierRequired"))
      .max(160, t("login.errors.identifierTooLong")),
    password: z
      .string()
      .min(1, t("login.errors.passwordRequired"))
      .max(128, t("login.errors.passwordTooLong")),
    rememberMe: z.boolean(),
  });
export type LoginValues = z.infer<ReturnType<typeof loginSchema>>;

export const newPasswordSchema = (t: AuthTranslator) =>
  z
    .string()
    .min(8, t("password.errors.tooShort"))
    .max(128, t("password.errors.tooLong"));

export const forgotRequestSchema = (t: AuthTranslator) =>
  z.object({
    phone: z
      .string()
      .trim()
      .min(1, t("forgot.errors.phoneRequired"))
      .refine(
        (v) => normalizePhone(v) !== null,
        t("forgot.errors.phoneInvalid"),
      ),
    channel: z.enum(["whatsapp", "sms"]),
  });
export type ForgotRequestValues = z.infer<
  ReturnType<typeof forgotRequestSchema>
>;

export const otpCodeSchema = (t: AuthTranslator) =>
  z.string().regex(/^\d{6}$/, t("forgot.errors.codeInvalid"));

const passwordsMatch = (t: AuthTranslator) => ({
  path: ["confirmPassword"],
  message: t("password.errors.mismatch"),
});

export const setPasswordSchema = (t: AuthTranslator) =>
  z
    .object({ newPassword: newPasswordSchema(t), confirmPassword: z.string() })
    .refine((v) => v.newPassword === v.confirmPassword, passwordsMatch(t));
export type SetPasswordValues = z.infer<ReturnType<typeof setPasswordSchema>>;

export const changePasswordSchema = (t: AuthTranslator) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(1, t("password.errors.currentRequired"))
        .max(128, t("password.errors.tooLong")),
      newPassword: newPasswordSchema(t),
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, passwordsMatch(t));
export type ChangePasswordValues = z.infer<
  ReturnType<typeof changePasswordSchema>
>;

export interface PasswordRules {
  length: boolean;
  number: boolean;
  case: boolean;
  symbol: boolean;
}

/** Hints shown under the new-password field. Only the length is required. */
export function passwordRules(password: string): PasswordRules {
  return {
    length: password.length >= 8,
    number: /\d/.test(password),
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

/** 0 (too short) … 4 (strong). */
export function passwordStrength(password: string): number {
  const rules = passwordRules(password);
  if (!rules.length) return 0;
  return 1 + [rules.number, rules.case, rules.symbol].filter(Boolean).length;
}
