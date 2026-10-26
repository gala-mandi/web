import { z } from "zod";
import { forgotText, loginText, passwordText } from "./text";

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

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, loginText.errors.identifierRequired)
    .max(160, loginText.errors.identifierTooLong),
  password: z
    .string()
    .min(1, loginText.errors.passwordRequired)
    .max(128, loginText.errors.passwordTooLong),
  rememberMe: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const newPasswordSchema = z
  .string()
  .min(8, passwordText.errors.tooShort)
  .max(128, passwordText.errors.tooLong);

export const forgotRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, forgotText.errors.phoneRequired)
    .refine((v) => normalizePhone(v) !== null, forgotText.errors.phoneInvalid),
  channel: z.enum(["whatsapp", "sms"]),
});
export type ForgotRequestValues = z.infer<typeof forgotRequestSchema>;

export const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, forgotText.errors.codeInvalid);

const passwordsMatch = {
  path: ["confirmPassword"],
  message: passwordText.errors.mismatch,
};

export const setPasswordSchema = z
  .object({ newPassword: newPasswordSchema, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, passwordsMatch);
export type SetPasswordValues = z.infer<typeof setPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, passwordText.errors.currentRequired)
      .max(128, passwordText.errors.tooLong),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, passwordsMatch);
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

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
