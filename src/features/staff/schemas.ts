import { z } from "zod";
import {
  type AuthTranslator,
  newPasswordSchema,
  normalizePhone,
} from "@/features/auth/schemas";
import type { Translator } from "@/i18n/types";
import type { InviteInput, StaffRole } from "./types";

export const staffRoles = ["owner", "manager", "operator"] as const;
export const inviteRoles = ["manager", "operator"] as const;

/** Error messages come from the `staff` messages of the interface language. */
export type StaffTranslator = Translator<"staff">;

export const inviteSchema = (t: StaffTranslator) =>
  z
    .object({
      phone: z
        .string()
        .trim()
        .min(1, t("invite.errors.phoneRequired"))
        .refine(
          (v) => normalizePhone(v) !== null,
          t("invite.errors.phoneInvalid"),
        ),
      role: z.enum(inviteRoles, { error: t("invite.errors.roleRequired") }),
      method: z.enum(["link", "password"]),
      name: z.string().trim().max(120, t("invite.errors.nameTooLong")),
    })
    .superRefine((v, ctx) => {
      // The invited person types their own name on the link page.
      if (v.method === "password" && v.name.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["name"],
          message: t("invite.errors.nameRequired"),
        });
      }
    });
export type InviteValues = z.infer<ReturnType<typeof inviteSchema>>;

/** Form fields the server may report errors on. */
export const inviteFields = ["phone", "role", "method", "name"] as const;

export const emptyInvite: InviteValues = {
  phone: "",
  role: "operator",
  method: "link",
  name: "",
};

export function toInviteInput(values: InviteValues): InviteInput {
  const input: InviteInput = {
    phone: normalizePhone(values.phone) ?? values.phone.trim(),
    role: values.role,
    method: values.method,
  };
  if (values.method === "password") input.name = values.name;
  return input;
}

export const changeRoleSchema = z.object({
  role: z.enum(staffRoles),
});
export type ChangeRoleValues = { role: StaffRole };

/** 3.1 Accept invite: name + password + confirm (`NewPasswordFields`). */
export const acceptInviteSchema = (t: StaffTranslator, ta: AuthTranslator) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t("accept.errors.nameRequired"))
        .max(120, t("accept.errors.nameTooLong")),
      newPassword: newPasswordSchema(ta),
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      path: ["confirmPassword"],
      message: ta("password.errors.mismatch"),
    });
export type AcceptInviteValues = z.infer<ReturnType<typeof acceptInviteSchema>>;
