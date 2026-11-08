"use client";

import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, UserPlus, Users } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReadOnly, useSubscription } from "@/features/subscription/hooks";
import { USER_LIMIT_CODE } from "@/features/subscription/keys";
import { toApiError } from "@/lib/api-error";
import { applyServerErrors, generalErrorMessage } from "../form-errors";
import { useInviteStaff } from "../hooks";
import {
  emptyInvite,
  inviteFields,
  inviteRoles,
  inviteSchema,
  type InviteValues,
  toInviteInput,
} from "../schemas";
import type { InviteMethod } from "../types";
import { OneTimeSecretDialog } from "./one-time-secret-dialog";

const methods: InviteMethod[] = ["link", "password"];

export const inputClass = "rounded-field h-[50px] bg-card";

/**
 * "Invite staff" button + dialog form. On success the form closes and the
 * invite link or temporary password is shown once, then forgotten.
 */
export function InviteDialog() {
  // The page already needs `staff.manage`; a read-only shop can't invite.
  return useReadOnly() ? null : <InviteDialogInner />;
}

/** "Your plan is full" with the plan's limit (403 `PLAN_USER_LIMIT`). */
function PlanLimitAlert() {
  const plan = useSubscription().data?.subscription?.plan;
  const lt = useTranslations("subscription.limit");
  return (
    <div
      role="alert"
      data-testid="plan-limit-alert"
      className="bg-notice-soft text-notice flex items-start gap-3 rounded-xl border border-notice-border px-3.5 py-3"
    >
      <Users aria-hidden className="mt-0.5 size-4 flex-none" />
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold">{lt("title")}</span>
        <span className="text-[13px]/relaxed">
          {plan
            ? lt("body", { plan: plan.name, max: plan.maxUsers })
            : lt("bodyUnknown")}
        </span>
      </div>
    </div>
  );
}

function InviteDialogInner() {
  const t = useTranslations("staff");
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const invite = useInviteStaff();
  const inFlight = useRef(false);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema(t)),
    defaultValues: emptyInvite,
  });
  const method = useWatch({ control: form.control, name: "method" });

  const close = () => {
    setOpen(false);
    setFormError(null);
    setLimitReached(false);
    form.reset(emptyInvite);
  };

  const submit = async (values: InviteValues) => {
    setFormError(null);
    setLimitReached(false);
    try {
      await invite.mutateAsync(toInviteInput(values));
      close();
    } catch (error) {
      const e = toApiError(error);
      if (e.code === USER_LIMIT_CODE) {
        setLimitReached(true);
        return;
      }
      if (
        !applyServerErrors(e, form.setError, inviteFields, {
          conflicts: {
            PHONE_TAKEN: {
              field: "phone",
              message: t("invite.errors.phoneTaken"),
            },
          },
          fallback: t("errors.generic"),
        })
      ) {
        setFormError(generalErrorMessage(e, t));
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // A double click must never send two invites.
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  const busy = form.formState.isSubmitting || invite.isPending;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          if (next) setOpen(true);
          else close();
        }}
      >
        <DialogTrigger asChild>
          <Button size="lg" className="h-10 gap-2 px-4 font-semibold">
            <UserPlus aria-hidden />
            {t("invite.title")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              {t("invite.title")}
            </DialogTitle>
            <DialogDescription>{t("invite.description")}</DialogDescription>
          </DialogHeader>

          <form
            method="post"
            noValidate
            onSubmit={onSubmit}
            aria-busy={busy || undefined}
            className="flex flex-col gap-5"
          >
            {limitReached ? <PlanLimitAlert /> : null}
            {formError ? (
              <div
                role="alert"
                className="bg-destructive-soft border-destructive-border text-destructive flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
              >
                <AlertCircle aria-hidden className="mt-px size-4 flex-none" />
                {formError}
              </div>
            ) : null}

            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-2">
                  <FieldLabel htmlFor="invite-phone">
                    {t("invite.phone")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="invite-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    dir="ltr"
                    placeholder={t("invite.phonePlaceholder")}
                    className={inputClass}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.error ? "invite-phone-error" : undefined
                    }
                  />
                  <FieldError
                    id="invite-phone-error"
                    errors={[fieldState.error]}
                  />
                </Field>
              )}
            />

            <Controller
              name="role"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-2">
                  <FieldLabel id="invite-role-label" htmlFor="invite-role">
                    {t("invite.role")}
                  </FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="invite-role"
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-labelledby="invite-role-label"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={
                        fieldState.error
                          ? "invite-role-hint invite-role-error"
                          : "invite-role-hint"
                      }
                      className="rounded-field bg-card w-full data-[size=default]:h-[50px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {inviteRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {t(`roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription id="invite-role-hint">
                    {t(`roleHints.${field.value}`)}
                  </FieldDescription>
                  <FieldError
                    id="invite-role-error"
                    errors={[fieldState.error]}
                  />
                </Field>
              )}
            />

            <Controller
              name="method"
              control={form.control}
              render={({ field, fieldState }) => (
                <FieldSet data-invalid={fieldState.invalid} className="gap-3">
                  <FieldLegend variant="label">
                    {t("invite.method")}
                  </FieldLegend>
                  <RadioGroup
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.clearErrors("name");
                    }}
                    className="gap-2.5"
                  >
                    {methods.map((m) => (
                      <FieldLabel
                        key={m}
                        htmlFor={`invite-method-${m}`}
                        className="rounded-field has-data-checked:border-primary has-data-checked:bg-primary/5 border p-3"
                      >
                        <Field orientation="horizontal" className="gap-3">
                          <RadioGroupItem
                            value={m}
                            id={`invite-method-${m}`}
                            aria-describedby={`invite-method-${m}-hint`}
                          />
                          <FieldContent className="gap-0.5">
                            <span className="font-semibold">
                              {t(`invite.methods.${m}.label`)}
                            </span>
                            <span
                              id={`invite-method-${m}-hint`}
                              className="text-muted-foreground text-[13px] font-normal"
                            >
                              {t(`invite.methods.${m}.hint`)}
                            </span>
                          </FieldContent>
                        </Field>
                      </FieldLabel>
                    ))}
                  </RadioGroup>
                  <FieldError errors={[fieldState.error]} />
                </FieldSet>
              )}
            />

            {method === "password" ? (
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-2">
                    <FieldLabel htmlFor="invite-name">
                      {t("invite.name")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="invite-name"
                      autoComplete="off"
                      placeholder={t("invite.namePlaceholder")}
                      className={inputClass}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={
                        fieldState.error ? "invite-name-error" : undefined
                      }
                    />
                    <FieldError
                      id="invite-name-error"
                      errors={[fieldState.error]}
                    />
                  </Field>
                )}
              />
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10"
                disabled={busy}
                onClick={close}
              >
                {t("invite.cancel")}
              </Button>
              <Button
                type="submit"
                className="h-10 gap-2 px-4 font-semibold"
                disabled={busy}
                aria-busy={busy || undefined}
              >
                {busy ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : null}
                {busy
                  ? t("invite.submitting")
                  : method === "password"
                    ? t("invite.submitPassword")
                    : t("invite.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {invite.data ? (
        // Forgotten as soon as the dialog closes.
        <OneTimeSecretDialog
          result={invite.data}
          onDone={() => invite.reset()}
        />
      ) : null}
    </>
  );
}
