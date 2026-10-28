"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
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
import { inviteText as t, roleHint, roleText } from "../text";
import type { InviteMethod } from "../types";
import { OneTimeSecretDialog } from "./one-time-secret-dialog";

const methods: InviteMethod[] = ["link", "password"];

export const inputClass = "rounded-field h-11 bg-card";

/**
 * "Invite staff" button + dialog form. On success the form closes and the
 * invite link or temporary password is shown once, then forgotten.
 */
export function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const invite = useInviteStaff();
  const inFlight = useRef(false);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: emptyInvite,
  });
  const method = useWatch({ control: form.control, name: "method" });

  const close = () => {
    setOpen(false);
    setFormError(null);
    form.reset(emptyInvite);
  };

  const submit = async (values: InviteValues) => {
    setFormError(null);
    try {
      await invite.mutateAsync(toInviteInput(values));
      close();
    } catch (error) {
      const e = toApiError(error);
      if (!applyServerErrors(e, form.setError, inviteFields)) {
        setFormError(generalErrorMessage(e));
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
            {t.title}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              {t.title}
            </DialogTitle>
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>

          <form
            method="post"
            noValidate
            onSubmit={onSubmit}
            aria-busy={busy || undefined}
            className="flex flex-col gap-5"
          >
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
                  <FieldLabel htmlFor="invite-phone">{t.phone}</FieldLabel>
                  <Input
                    {...field}
                    id="invite-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    dir="ltr"
                    placeholder={t.phonePlaceholder}
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
                    {t.role}
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
                      className="rounded-field bg-card w-full data-[size=default]:h-11"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {inviteRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleText[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription id="invite-role-hint">
                    {roleHint[field.value]}
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
                  <FieldLegend variant="label">{t.method}</FieldLegend>
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
                              {t.methods[m].label}
                            </span>
                            <span
                              id={`invite-method-${m}-hint`}
                              className="text-muted-foreground text-[13px] font-normal"
                            >
                              {t.methods[m].hint}
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
                    <FieldLabel htmlFor="invite-name">{t.name}</FieldLabel>
                    <Input
                      {...field}
                      id="invite-name"
                      autoComplete="off"
                      placeholder={t.namePlaceholder}
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
                {t.cancel}
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
                  ? t.submitting
                  : method === "password"
                    ? t.submitPassword
                    : t.submit}
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
