"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Clock, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  remainingAttempts,
  retryAfterSeconds,
  toApiError,
} from "@/lib/api-error";
import { blockedPageFor, homePathFor, startSession } from "@/lib/auth-session";
import { safeNextPath } from "@/lib/navigation";
import { login } from "../api";
import {
  type LoginValues,
  loginSchema,
  maskIdentifier,
  normalizeIdentifier,
  normalizePhone,
} from "../schemas";
import { loginText } from "../text";
import {
  AuthCard,
  CardHeading,
  fieldLabelClass,
  IconInput,
  PasswordInput,
  PrimaryButton,
  TextLink,
  UrduLine,
} from "./auth-ui";
import { LockedOut } from "./locked-out";

const t = loginText;

type Failure =
  | { kind: "credentials"; attemptsLeft: number | null }
  | { kind: "network" }
  | { kind: "unknown" };

interface Lock {
  id: number;
  seconds: number;
  who: string | null;
}

export interface LoginFormProps {
  /** `?reason=` from the URL, e.g. `session-expired`. */
  reason?: string | null;
  /** `?next=` from the URL, only same-origin paths are used. */
  next?: string | null;
  /** `?phone=` from the URL (after accepting an invite): prefills the field. */
  phone?: string | null;
}

/** 1.1 Sign in, with 1.2 wrong password, 1.3 locked and 3.3 session expired. */
export function LoginForm({
  reason = null,
  next = null,
  phone = null,
}: LoginFormProps) {
  const router = useRouter();
  const [failure, setFailure] = useState<Failure | null>(null);
  const [lock, setLock] = useState<Lock | null>(null);
  const [leaving, setLeaving] = useState(false);
  const inFlight = useRef(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: (phone && normalizePhone(phone)) ?? "",
      password: "",
      rememberMe: true,
    },
  });

  const submit = async (values: LoginValues) => {
    setFailure(null);
    try {
      const session = await login({
        identifier: normalizeIdentifier(values.identifier),
        password: values.password,
        rememberMe: values.rememberMe,
      });
      startSession(session);
      setLeaving(true);
      router.replace(homePathFor(session.user, safeNextPath(next)));
    } catch (error) {
      const e = toApiError(error);
      const blocked = e.status === 403 ? blockedPageFor(e.code) : null;
      if (blocked) {
        setLeaving(true);
        router.replace(blocked);
      } else if (e.status === 401) {
        setFailure({ kind: "credentials", attemptsLeft: remainingAttempts(e) });
        form.setError("password", {
          type: "server",
          message: t.errors.capsLock,
        });
      } else if (e.status === 429) {
        setLock((prev) => ({
          id: (prev?.id ?? 0) + 1,
          seconds: retryAfterSeconds(e),
          who: maskIdentifier(values.identifier),
        }));
      } else if (e.status === 400 && e.errors.length > 0) {
        for (const { field, message } of e.errors) {
          if (field === "identifier" || field === "password") {
            form.setError(field, { type: "server", message });
          }
        }
      } else {
        setFailure({ kind: e.status === 0 ? "network" : "unknown" });
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A double click must never send two requests.
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  const unlock = useCallback(() => setLock(null), []);

  if (lock) {
    return (
      <LockedOut
        lockId={lock.id}
        seconds={lock.seconds}
        who={lock.who}
        onUnlock={unlock}
      />
    );
  }

  const busy = form.formState.isSubmitting || leaving;
  const wrongPassword = failure?.kind === "credentials";

  return (
    <AuthCard>
      <CardHeading title={t.title} description={t.subtitle} />

      {reason === "session-expired" && !failure ? (
        <div
          role="status"
          className="bg-background text-foreground flex gap-3 rounded-[14px] border px-4 py-3.5"
        >
          <Clock aria-hidden className="text-primary mt-0.5 size-5 flex-none" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">{t.sessionExpired.title}</span>
            <span className="text-muted-foreground text-[13px]">
              {t.sessionExpired.body}
            </span>
            <UrduLine className="text-start text-xs">
              {t.sessionExpired.ur}
            </UrduLine>
          </div>
        </div>
      ) : null}

      {failure ? (
        <div
          role="alert"
          className="bg-destructive-soft border-destructive-border flex gap-3 rounded-[14px] border px-4 py-3.5"
        >
          <AlertCircle
            aria-hidden
            className="text-destructive mt-0.5 size-5 flex-none"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-destructive text-sm font-bold">
              {failure.kind === "credentials"
                ? t.errors.invalidCredentials
                : failure.kind === "network"
                  ? t.errors.network
                  : t.errors.unknown}
            </span>
            {failure.kind === "credentials" && failure.attemptsLeft !== null ? (
              <span className="text-foreground/85 text-[13px]">
                {t.errors.attemptsLeft(failure.attemptsLeft)}
              </span>
            ) : null}
            {failure.kind === "credentials" ? (
              <UrduLine className="text-start text-xs">
                {t.errors.invalidCredentialsUr}
              </UrduLine>
            ) : null}
          </div>
        </div>
      ) : null}

      <form
        method="post"
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
      >
        <Controller
          name="identifier"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel
                htmlFor="login-identifier"
                className={fieldLabelClass}
              >
                {t.identifierLabel}
              </FieldLabel>
              <IconInput
                {...field}
                id="login-identifier"
                icon={<User />}
                autoComplete="username"
                inputMode="email"
                placeholder={t.identifierPlaceholder}
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.error ? "login-identifier-error" : undefined
                }
              />
              <FieldError
                id="login-identifier-error"
                errors={[fieldState.error]}
              />
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel
                  htmlFor="login-password"
                  className={fieldLabelClass}
                >
                  {t.passwordLabel}
                </FieldLabel>
                <TextLink href="/forgot-password">{t.forgotPassword}</TextLink>
              </div>
              <PasswordInput
                {...field}
                id="login-password"
                icon={<Lock />}
                autoComplete="current-password"
                placeholder={t.passwordPlaceholder}
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.error ? "login-password-error" : undefined
                }
              />
              <FieldError
                id="login-password-error"
                className="text-[12.5px] font-medium"
                errors={[fieldState.error]}
              />
            </Field>
          )}
        />

        <Controller
          name="rememberMe"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal" className="gap-2.5">
              <Checkbox
                id="login-remember"
                name={field.name}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                ref={field.ref}
                className="size-[18px]"
              />
              <FieldLabel
                htmlFor="login-remember"
                className="text-foreground/85 text-sm font-normal"
              >
                {t.rememberMe}
              </FieldLabel>
            </Field>
          )}
        />

        <PrimaryButton
          type="submit"
          disabled={busy}
          pending={busy}
          ur={wrongPassword ? t.retryUr : t.submitUr}
        >
          {busy ? t.submitting : wrongPassword ? t.retry : t.submit}
        </PrimaryButton>
      </form>

      <div className="flex flex-col gap-0.5 text-center">
        <span className="text-muted-foreground text-[13px]">{t.staffHint}</span>
        <UrduLine className="text-center text-xs">{t.staffHintUr}</UrduLine>
      </div>
    </AuthCard>
  );
}
