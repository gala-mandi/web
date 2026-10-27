"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Lock } from "lucide-react";
import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { toApiError } from "@/lib/api-error";
import { landingPathFor } from "@/lib/routes";
import { useSessionStore } from "@/stores/session";
import { changePassword } from "../api";
import { authKeys, useLogout } from "../hooks";
import { type ChangePasswordValues, changePasswordSchema } from "../schemas";
import { changePasswordText, loginText, passwordChangedText } from "../text";
import {
  AuthCard,
  CardHeading,
  fieldLabelClass,
  PasswordInput,
  PrimaryButton,
} from "./auth-ui";
import { NewPasswordFields } from "./new-password-fields";
import { PasswordChanged } from "./password-changed";

const t = changePasswordText;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** 3.2 First login — change password (also used for a normal change). */
export function ChangePasswordForm() {
  const user = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const logout = useLogout();
  const [revoked, setRevoked] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const mustChange = Boolean(user?.mustChangePassword);
  const copy = mustChange ? t.mustChange : t.voluntary;

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(
    async ({ currentPassword, newPassword }) => {
      setFormError(null);
      try {
        const result = await changePassword({ currentPassword, newPassword });
        if (user) setUser({ ...user, mustChangePassword: false });
        await queryClient.invalidateQueries({ queryKey: authKeys.me() });
        setRevoked(result.revokedSessions);
      } catch (error) {
        const e = toApiError(error);
        let shown = false;
        for (const { field, message } of e.errors) {
          if (field === "currentPassword" || field === "newPassword") {
            form.setError(field, { type: "server", message });
            shown = true;
          }
        }
        if (!shown) {
          setFormError(
            e.status === 0
              ? loginText.errors.network
              : (e.message ?? loginText.errors.unknown),
          );
        }
      }
    },
  );

  if (revoked !== null) {
    return (
      <PasswordChanged
        revokedSessions={revoked}
        otherDevices
        href={landingPathFor(user)}
        label={passwordChangedText.toDashboard}
        labelUr={passwordChangedText.toDashboardUr}
      />
    );
  }

  return (
    <AuthCard>
      {user ? (
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="bg-primary/10 text-primary font-heading flex size-12 items-center justify-center rounded-full text-base font-extrabold"
          >
            {initials(user.name)}
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[13px]">
              {t.greeting}
            </span>
            <span className="font-bold">{user.name}</span>
          </div>
        </div>
      ) : null}
      <CardHeading
        size="md"
        title={copy.title}
        description={copy.body}
        ur={copy.ur}
      />
      {formError ? (
        <div
          role="alert"
          className="bg-destructive-soft border-destructive-border text-destructive flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
        >
          <AlertCircle aria-hidden className="mt-px size-4 flex-none" />
          {formError}
        </div>
      ) : null}
      <FormProvider {...form}>
        <form
          method="post"
          noValidate
          onSubmit={onSubmit}
          className="flex flex-col gap-5"
        >
          <Controller
            name="currentPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-2">
                <FieldLabel htmlFor="ct-current" className={fieldLabelClass}>
                  {copy.currentLabel}
                </FieldLabel>
                <PasswordInput
                  {...field}
                  id="ct-current"
                  icon={<Lock />}
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    fieldState.error ? "ct-current-error" : undefined
                  }
                />
                <FieldError id="ct-current-error" errors={[fieldState.error]} />
              </Field>
            )}
          />
          <NewPasswordFields idPrefix="ct" showRules={false} />
          <PrimaryButton
            type="submit"
            disabled={form.formState.isSubmitting}
            pending={form.formState.isSubmitting}
            ur={t.submitUr}
          >
            {form.formState.isSubmitting ? t.submitting : t.submit}
          </PrimaryButton>
        </form>
      </FormProvider>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="text-muted-foreground self-center text-[13px] font-semibold hover:underline"
      >
        {t.signOut}
      </button>
    </AuthCard>
  );
}
