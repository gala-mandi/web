import { z } from "zod";
import { newPasswordSchema, normalizePhone } from "@/features/auth/schemas";
import { passwordText } from "@/features/auth/text";
import { acceptText, inviteText } from "./text";
import type { InviteInput, StaffRole } from "./types";

export const staffRoles = ["owner", "manager", "operator"] as const;
export const inviteRoles = ["manager", "operator"] as const;

const e = inviteText.errors;

export const inviteSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .min(1, e.phoneRequired)
      .refine((v) => normalizePhone(v) !== null, e.phoneInvalid),
    role: z.enum(inviteRoles, { error: e.roleRequired }),
    method: z.enum(["link", "password"]),
    name: z.string().trim().max(120, e.nameTooLong),
  })
  .superRefine((v, ctx) => {
    // The invited person types their own name on the link page.
    if (v.method === "password" && v.name.length === 0) {
      ctx.addIssue({ code: "custom", path: ["name"], message: e.nameRequired });
    }
  });
export type InviteValues = z.infer<typeof inviteSchema>;

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

const passwordsMatch = {
  path: ["confirmPassword"],
  message: passwordText.errors.mismatch,
};

/** 3.1 Accept invite: name + password + confirm (`NewPasswordFields`). */
export const acceptInviteSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, acceptText.errors.nameRequired)
      .max(120, acceptText.errors.nameTooLong),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, passwordsMatch);
export type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;
