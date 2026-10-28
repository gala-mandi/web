"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, MailWarning, User } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  AuthCard,
  CardHeading,
  fieldLabelClass,
  IconInput,
  PrimaryButton,
  TextLink,
  UrduLine,
} from "@/features/auth/components/auth-ui";
import { NewPasswordFields } from "@/features/auth/components/new-password-fields";
import { blockedText, loginText } from "@/features/auth/text";
import { toApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { applyServerErrors } from "../form-errors";
import { useAcceptInvite } from "../hooks";
import { type AcceptInviteValues, acceptInviteSchema } from "../schemas";
import {
  acceptText as t,
  type InviteErrorCode,
  inviteErrorCodes,
} from "../text";
import type { AcceptInviteResult } from "../types";

function isInviteError(code: string | undefined): code is InviteErrorCode {
  return (inviteErrorCodes as readonly string[]).includes(code ?? "");
}

/** A dead link: invalid, used, cancelled, expired, or the phone has an account. */
interface Failed {
  message: string;
  phoneTaken: boolean;
}

export function signInPathFor(phone: string): string {
  return `/login?${new URLSearchParams({ phone }).toString()}`;
}

/** Drops `?token=` from the address bar so it isn't left in history or shared. */
function useHideTokenFromUrl() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("token")) return;
    url.searchParams.delete("token");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  }, []);
}

function Joined({ result }: { result: AcceptInviteResult }) {
  const s = t.success;
  const linkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => linkRef.current?.focus(), []);
  return (
    <AuthCard className="items-center text-center">
      <div className="bg-success border-card flex size-[76px] items-center justify-center rounded-full border-[6px] shadow-[0_10px_24px_-8px_rgb(4_120_87/0.6)]">
        <Check
          aria-hidden
          className="size-[34px] text-white"
          strokeWidth={2.6}
        />
      </div>
      <div role="status" className="flex flex-col gap-1.5">
        <h2 className="font-heading text-[26px] font-extrabold tracking-tight">
          {s.title(result.shopName)}
        </h2>
        <p className="text-muted-foreground text-[15px]/relaxed">{s.body}</p>
        <UrduLine>{s.ur}</UrduLine>
      </div>
      <Link
        ref={linkRef}
        href={signInPathFor(result.phone)}
        className={cn(
          "rounded-button from-primary to-brand-to text-primary-foreground shadow-button flex h-[52px] w-full items-center justify-center gap-2.5 bg-linear-90 text-base font-bold hover:opacity-95",
          "focus-visible:ring-ring/15 focus-visible:ring-4 focus-visible:outline-none",
        )}
      >
        {s.signIn}
        <span aria-hidden>·</span>
        <span lang="ur" className="font-urdu text-[15px] font-semibold">
          {s.signInUr}
        </span>
      </Link>
    </AuthCard>
  );
}

function CantUse({ failed }: { failed: Failed }) {
  const f = t.failed;
  return (
    <AuthCard>
      <div className="bg-destructive-soft text-destructive border-destructive-border flex size-[60px] items-center justify-center rounded-[18px] border">
        <MailWarning aria-hidden className="size-7" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-[26px] font-extrabold tracking-tight">
          {failed.phoneTaken ? f.phoneTakenTitle : f.title}
        </h2>
        <p
          role="alert"
          className="text-foreground text-[15px]/relaxed font-semibold"
        >
          {failed.message}
        </p>
        {failed.phoneTaken ? null : (
          <p className="text-muted-foreground text-[14px]/relaxed">
            {f.askOwner}
          </p>
        )}
      </div>
      <TextLink href="/login" className="self-start text-sm">
        {f.toSignIn}
      </TextLink>
    </AuthCard>
  );
}

/**
 * 3.1 Accept staff invite. The token comes from the link (`?token=`), is kept
 * in memory only and removed from the address bar at once.
 */
export function AcceptInviteForm({ token }: { token: string | null }) {
  // Kept for this page view only: never written to storage or the URL.
  const [inviteToken] = useState(token);
  useHideTokenFromUrl();
  const accept = useAcceptInvite();
  const [failed, setFailed] = useState<Failed | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const form = useForm<AcceptInviteValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { name: "", newPassword: "", confirmPassword: "" },
  });

  const submit = async (values: AcceptInviteValues) => {
    if (!inviteToken) return;
    setFormError(null);
    try {
      await accept.mutateAsync({
        token: inviteToken,
        name: values.name,
        password: values.newPassword,
      });
    } catch (error) {
      const e = toApiError(error);
      if (isInviteError(e.code)) {
        setFailed({
          message: e.message ?? t.errors[e.code],
          phoneTaken: false,
        });
      } else if (e.code === "PHONE_TAKEN" || e.status === 409) {
        setFailed({ message: t.errors.phoneTaken, phoneTaken: true });
      } else if (e.code === "TENANT_SUSPENDED") {
        setFormError(e.message ?? blockedText.shopSuspended.title(null));
      } else if (e.status === 429) {
        setFormError(t.errors.tooMany);
      } else if (
        !applyServerErrors(e, form.setError, ["name", "newPassword"], {
          password: "newPassword",
        })
      ) {
        if (e.errors.some((err) => err.field === "token")) {
          setFailed({
            message: e.message ?? t.errors.INVITE_INVALID,
            phoneTaken: false,
          });
        } else {
          setFormError(
            e.status === 0
              ? loginText.errors.network
              : (e.message ?? loginText.errors.unknown),
          );
        }
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A double click must never send two requests.
    if (inFlight.current || accept.isSuccess) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  if (accept.data) return <Joined result={accept.data} />;
  if (failed) return <CantUse failed={failed} />;
  if (!inviteToken) {
    return (
      <CantUse failed={{ message: t.errors.missingToken, phoneTaken: false }} />
    );
  }

  const busy = form.formState.isSubmitting || accept.isPending;

  return (
    <AuthCard>
      <CardHeading title={t.title} description={t.body} ur={t.ur} />

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
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-2">
                <FieldLabel htmlFor="ai-name" className={fieldLabelClass}>
                  {t.name}
                </FieldLabel>
                <IconInput
                  {...field}
                  id="ai-name"
                  icon={<User />}
                  autoComplete="name"
                  placeholder={t.namePlaceholder}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    fieldState.error ? "ai-name-error" : undefined
                  }
                />
                <FieldError id="ai-name-error" errors={[fieldState.error]} />
              </Field>
            )}
          />
          <NewPasswordFields idPrefix="ai" showRules={false} />
          <PrimaryButton
            type="submit"
            disabled={busy}
            pending={busy}
            ur={t.submitUr}
          >
            {busy ? t.submitting : t.submit}
          </PrimaryButton>
        </form>
      </FormProvider>

      <p className="text-muted-foreground text-center text-[13px]">
        {t.footer} <TextLink href="/login">{t.ignore}</TextLink>
      </p>
    </AuthCard>
  );
}
