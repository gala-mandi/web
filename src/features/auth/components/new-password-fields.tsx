"use client";

import { Check, CheckCircle2, Circle, KeyRound, Lock } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  passwordRules,
  passwordStrength,
  type SetPasswordValues,
} from "../schemas";
import { passwordText } from "../text";
import { fieldLabelClass, PasswordInput } from "./auth-ui";

const t = passwordText;
const strengthColor = [
  "bg-destructive",
  "bg-destructive",
  "bg-warning-strong",
  "bg-success",
  "bg-success",
];

/**
 * New password + confirm with the strength meter and rule hints of 2.3/3.2.
 * Use inside a `FormProvider` whose values include `SetPasswordValues`.
 */
export function NewPasswordFields({
  idPrefix,
  showRules = true,
}: {
  idPrefix: string;
  showRules?: boolean;
}) {
  const { control } = useFormContext<SetPasswordValues>();
  const [newPassword, confirmPassword] = useWatch({
    control,
    name: ["newPassword", "confirmPassword"],
  });
  const value = newPassword ?? "";
  const strength = passwordStrength(value);
  const rules = passwordRules(value);
  const matches = value.length > 0 && value === confirmPassword;

  return (
    <>
      <Controller
        name="newPassword"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel htmlFor={`${idPrefix}-new`} className={fieldLabelClass}>
              {t.newLabel}
            </FieldLabel>
            <PasswordInput
              {...field}
              id={`${idPrefix}-new`}
              icon={<KeyRound />}
              autoComplete="new-password"
              placeholder={t.newPlaceholder}
              aria-invalid={fieldState.invalid}
              aria-describedby={`${idPrefix}-strength${fieldState.error ? ` ${idPrefix}-new-error` : ""}`}
            />
            <div
              id={`${idPrefix}-strength`}
              className="flex items-center gap-3"
            >
              <div aria-hidden className="flex flex-1 gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <span
                    key={n}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      value && n <= Math.max(strength, 1)
                        ? strengthColor[strength]
                        : "bg-border",
                    )}
                  />
                ))}
              </div>
              <span className="text-muted-foreground min-w-14 text-end text-xs font-semibold">
                <span className="sr-only">{t.strengthLabel}: </span>
                {value ? t.strength[strength] : ""}
              </span>
            </div>
            <FieldError
              id={`${idPrefix}-new-error`}
              errors={[fieldState.error]}
            />
          </Field>
        )}
      />

      {showRules ? (
        <ul className="bg-background grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] px-4 py-3.5 text-[13px]">
          {(Object.keys(t.rules) as (keyof typeof t.rules)[]).map((rule) => (
            <li
              key={rule}
              className={cn(
                "flex items-center gap-2",
                rules[rule] ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {rules[rule] ? (
                <CheckCircle2
                  aria-hidden
                  className="text-success size-4 flex-none"
                />
              ) : (
                <Circle aria-hidden className="size-4 flex-none" />
              )}
              <span>{t.rules[rule]}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <Controller
        name="confirmPassword"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel
              htmlFor={`${idPrefix}-confirm`}
              className={fieldLabelClass}
            >
              {t.confirmLabel}
            </FieldLabel>
            <PasswordInput
              {...field}
              id={`${idPrefix}-confirm`}
              icon={<Lock />}
              autoComplete="new-password"
              placeholder={t.confirmPlaceholder}
              aria-invalid={fieldState.invalid}
              aria-describedby={
                fieldState.error ? `${idPrefix}-confirm-error` : undefined
              }
            />
            {matches && !fieldState.error ? (
              <span className="text-success inline-flex items-center gap-1.5 text-xs font-semibold">
                <Check aria-hidden className="size-3.5" />
                {t.matches}
              </span>
            ) : null}
            <FieldError
              id={`${idPrefix}-confirm-error`}
              errors={[fieldState.error]}
            />
          </Field>
        )}
      />
    </>
  );
}
