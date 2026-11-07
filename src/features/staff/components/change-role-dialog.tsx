"use client";

import { bidi } from "@/i18n/bidi";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";
import { type FormEvent, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api-error";
import { applyServerErrors, generalErrorMessage } from "../form-errors";
import { useChangeRole } from "../hooks";
import {
  type ChangeRoleValues,
  changeRoleSchema,
  staffRoles,
} from "../schemas";
import type { StaffMember } from "../types";

/** Change one person's role; their new permissions apply at the next refresh. */
export function ChangeRoleDialog({
  member,
  onClose,
}: {
  member: StaffMember;
  onClose: () => void;
}) {
  const t = useTranslations("staff");
  const mutation = useChangeRole();
  const inFlight = useRef(false);
  const form = useForm<ChangeRoleValues>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { role: member.role },
  });
  const busy = form.formState.isSubmitting || mutation.isPending;

  const submit = async ({ role }: ChangeRoleValues) => {
    if (role === member.role) {
      onClose();
      return;
    }
    try {
      const updated = await mutation.mutateAsync({ id: member.id, role });
      toast.success(
        t("changeRole.done", {
          name: updated.name,
          role: t(`roles.${updated.role}`),
        }),
      );
      onClose();
    } catch (error) {
      const e = toApiError(error);
      if (
        !applyServerErrors(e, form.setError, ["role"], {
          fallback: t("errors.generic"),
        })
      ) {
        toast.error(generalErrorMessage(e, t));
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            {t("changeRole.title", { name: bidi(member.name) })}
          </DialogTitle>
          <DialogDescription>{t("changeRole.description")}</DialogDescription>
        </DialogHeader>
        <form
          method="post"
          noValidate
          onSubmit={onSubmit}
          aria-busy={busy || undefined}
          className="flex flex-col gap-5"
        >
          <Controller
            name="role"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-2">
                <FieldLabel id="change-role-label" htmlFor="change-role">
                  {t("changeRole.label")}
                </FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.clearErrors("role");
                  }}
                >
                  <SelectTrigger
                    id="change-role"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-labelledby="change-role-label"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.error
                        ? "change-role-hint change-role-error"
                        : "change-role-hint"
                    }
                    className="rounded-field bg-card w-full data-[size=default]:h-11"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {staffRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`roles.${role}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription id="change-role-hint">
                  {t(`roleHints.${field.value}`)}
                </FieldDescription>
                <FieldError
                  id="change-role-error"
                  errors={[fieldState.error]}
                />
              </Field>
            )}
          />
          <p
            role="note"
            className="bg-secondary text-secondary-foreground flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px]/relaxed font-medium"
          >
            <Info aria-hidden className="mt-0.5 size-4 flex-none" />
            {t("changeRole.appliesSoon")}
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={busy}
              onClick={onClose}
            >
              {t("changeRole.cancel")}
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
              {busy ? t("changeRole.saving") : t("changeRole.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
