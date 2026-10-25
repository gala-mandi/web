"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, MessageCircle, MessageSquare, Timer } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { forgotPassword, resetPassword } from "../api";
import {
  type ForgotRequestValues,
  forgotRequestSchema,
  normalizePhone,
  otpCodeSchema,
  type SetPasswordValues,
  setPasswordSchema,
} from "../schemas";
import { forgotText, loginText, passwordChangedText } from "../text";
import type { OtpChannel } from "../types";
import { formatClock, useCountdown } from "../use-countdown";
import {
  AuthCard,
  BackButton,
  BackLink,
  CardHeading,
  fieldLabelClass,
  IconInput,
  PrimaryButton,
  StepIndicator,
} from "./auth-ui";
import { NewPasswordFields } from "./new-password-fields";
import { OtpInput } from "./otp-input";
import { PasswordChanged } from "./password-changed";

const t = forgotText;

interface Sent {
  /** normalised, e.g. `03001234567` */
  phone: string;
  channel: OtpChannel;
  expiresIn: number;
  resendIn: number;
  /** changes on every send so the timers restart */
  sentId: number;
}

type Step =
  | { name: "request"; channel: OtpChannel; phone: string }
  | { name: "code"; sent: Sent; code: string; error: string | null }
  | { name: "password"; sent: Sent; code: string }
  | { name: "done"; revokedSessions: number };

function maskPhone(phone: string): string {
  // 03001234567 → +92 300 •••• 567
  return `+92 ${phone.slice(1, 4)} •••• ${phone.slice(-3)}`;
}

function FormMessage({ children }: { children: string }) {
  return (
    <div
      role="alert"
      className="bg-destructive-soft border-destructive-border text-destructive flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
    >
      <AlertCircle aria-hidden className="mt-px size-4 flex-none" />
      {children}
    </div>
  );
}

function errorMessage(error: unknown): string {
  const e = toApiError(error);
  if (e.status === 429) return t.errors.tooMany;
  if (e.status === 0) return loginText.errors.network;
  return e.message ?? loginText.errors.unknown;
}

/** 2.1 → 2.2 → 2.3 → 2.4. The code is kept here until `reset-password`. */
export function ForgotPasswordFlow() {
  const [step, setStep] = useState<Step>({
    name: "request",
    channel: "whatsapp",
    phone: "",
  });
  const [sends, setSends] = useState(0);

  const onSent = (
    phone: string,
    channel: OtpChannel,
    expiresIn: number,
    resendIn: number,
  ) => {
    const sentId = sends + 1;
    setSends(sentId);
    setStep({
      name: "code",
      sent: { phone, channel, expiresIn, resendIn, sentId },
      code: "",
      error: null,
    });
  };

  switch (step.name) {
    case "request":
      return (
        <RequestStep
          defaultChannel={step.channel}
          defaultPhone={step.phone}
          onSent={onSent}
        />
      );
    case "code":
      return (
        <CodeStep
          sent={step.sent}
          initialCode={step.code}
          serverError={step.error}
          onChangeNumber={(channel) =>
            setStep({
              name: "request",
              channel,
              phone: step.sent.phone.slice(1),
            })
          }
          onResent={onSent}
          onVerified={(code) =>
            setStep({ name: "password", sent: step.sent, code })
          }
        />
      );
    case "password":
      return (
        <PasswordStep
          sent={step.sent}
          code={step.code}
          onBack={() =>
            setStep({
              name: "code",
              sent: step.sent,
              code: step.code,
              error: null,
            })
          }
          onInvalidCode={(message) =>
            setStep({ name: "code", sent: step.sent, code: "", error: message })
          }
          onDone={(revokedSessions) =>
            setStep({ name: "done", revokedSessions })
          }
        />
      );
    case "done":
      return (
        <PasswordChanged
          revokedSessions={step.revokedSessions}
          otherDevices={false}
          href="/login"
          label={passwordChangedText.toSignIn}
          labelUr={passwordChangedText.toSignInUr}
        />
      );
  }
}

type OnSent = (
  phone: string,
  channel: OtpChannel,
  expiresIn: number,
  resendIn: number,
) => void;

function RequestStep({
  defaultChannel,
  defaultPhone,
  onSent,
}: {
  defaultChannel: OtpChannel;
  defaultPhone: string;
  onSent: OnSent;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ForgotRequestValues>({
    resolver: zodResolver(forgotRequestSchema),
    defaultValues: { phone: defaultPhone, channel: defaultChannel },
  });

  const onSubmit = form.handleSubmit(async ({ phone, channel }) => {
    setFormError(null);
    const normalized = normalizePhone(phone);
    if (!normalized) return;
    try {
      const result = await forgotPassword({ phone: normalized, channel });
      onSent(normalized, channel, result.expiresIn, result.resendIn);
    } catch (error) {
      const e = toApiError(error);
      const phoneError = e.errors.find((f) => f.field === "phone");
      if (phoneError)
        form.setError("phone", { type: "server", message: phoneError.message });
      else setFormError(errorMessage(error));
    }
  });

  return (
    <AuthCard>
      <BackLink href="/login">{t.backToSignIn}</BackLink>
      <StepIndicator step={1} label={t.step(1)} />
      <CardHeading
        size="md"
        title={t.request.title}
        description={t.request.body}
        ur={t.request.ur}
      />
      {formError ? <FormMessage>{formError}</FormMessage> : null}
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel htmlFor="fp-phone" className={fieldLabelClass}>
                {t.request.phoneLabel}
              </FieldLabel>
              <IconInput
                {...field}
                id="fp-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={t.request.phonePlaceholder}
                dir="ltr"
                icon={
                  <span className="text-foreground flex items-center gap-1.5 border-e pe-2.5 text-sm font-semibold">
                    <span className="text-muted-foreground text-[11px] font-bold">
                      {t.request.country}
                    </span>
                    {t.request.countryCode}
                  </span>
                }
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.error ? "fp-phone-error" : undefined
                }
              />
              <FieldError id="fp-phone-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="channel"
          control={form.control}
          render={({ field }) => (
            <FieldSet className="gap-2">
              <FieldLegend variant="label" className={fieldLabelClass}>
                {t.request.channelLegend}
              </FieldLegend>
              <RadioGroup
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                className="grid grid-cols-2 gap-2.5"
              >
                {(["whatsapp", "sms"] as const).map((channel) => {
                  const Icon =
                    channel === "whatsapp" ? MessageCircle : MessageSquare;
                  return (
                    <FieldLabel
                      key={channel}
                      htmlFor={`fp-ch-${channel}`}
                      className={cn(
                        "rounded-field flex h-[50px] w-full cursor-pointer items-center gap-2.5 border px-3.5 text-sm font-semibold",
                        "has-data-checked:border-primary has-data-checked:bg-primary/5 has-data-checked:border-2",
                        "has-focus-visible:ring-ring/15 has-focus-visible:ring-4",
                      )}
                    >
                      <RadioGroupItem value={channel} id={`fp-ch-${channel}`} />
                      <Icon
                        aria-hidden
                        className="text-muted-foreground size-[18px]"
                      />
                      {t.request[channel]}
                    </FieldLabel>
                  );
                })}
              </RadioGroup>
            </FieldSet>
          )}
        />
        <PrimaryButton
          type="submit"
          disabled={form.formState.isSubmitting}
          pending={form.formState.isSubmitting}
          ur={t.request.submitUr}
        >
          {form.formState.isSubmitting
            ? t.request.submitting
            : t.request.submit}
        </PrimaryButton>
      </form>
      <p className="text-muted-foreground text-center text-[13px]">
        {t.request.noPhone}{" "}
        <strong className="text-foreground">{t.request.noPhonePath}</strong>.
      </p>
    </AuthCard>
  );
}

function CodeStep({
  sent,
  initialCode,
  serverError,
  onChangeNumber,
  onResent,
  onVerified,
}: {
  sent: Sent;
  initialCode: string;
  serverError: string | null;
  onChangeNumber: (channel: OtpChannel) => void;
  onResent: OnSent;
  onVerified: (code: string) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(serverError);
  const [resending, setResending] = useState(false);
  const expiresLeft = useCountdown(sent.expiresIn, sent.sentId);
  const resendLeft = useCountdown(sent.resendIn, sent.sentId);
  const channelName = t.request[sent.channel];
  const otherChannel: OtpChannel =
    sent.channel === "whatsapp" ? "sms" : "whatsapp";

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      const result = await forgotPassword({
        phone: sent.phone,
        channel: sent.channel,
      });
      setCode("");
      onResent(sent.phone, sent.channel, result.expiresIn, result.resendIn);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setResending(false);
    }
  };

  const verify = (event: FormEvent) => {
    event.preventDefault();
    const parsed = otpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t.errors.codeInvalid);
      return;
    }
    onVerified(parsed.data);
  };

  return (
    <AuthCard>
      <BackButton onClick={() => onChangeNumber(sent.channel)}>
        {t.back}
      </BackButton>
      <StepIndicator step={2} label={t.step(2)} />
      <CardHeading
        size="md"
        title={t.code.title}
        description={
          <>
            {t.code.sentTo(channelName)}{" "}
            <strong dir="ltr" className="text-foreground">
              {maskPhone(sent.phone)}
            </strong>
            .{" "}
            <button
              type="button"
              onClick={() => onChangeNumber(sent.channel)}
              className="text-primary font-semibold hover:underline"
            >
              {t.code.change}
            </button>
          </>
        }
        ur={sent.channel === "whatsapp" ? t.code.ur : undefined}
      />
      <form noValidate onSubmit={verify} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className={cn(fieldLabelClass, "mb-2")}>
            {t.code.legend}
          </legend>
          <OtpInput
            value={code}
            onChange={(value) => {
              setCode(value);
              setError(null);
            }}
            invalid={error !== null}
            label={t.code.digitLabel}
            describedBy={error ? "otp-error" : undefined}
            autoFocus
          />
          {error ? (
            <span
              id="otp-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {error}
            </span>
          ) : null}
        </fieldset>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Timer aria-hidden className="size-4" />
            {expiresLeft > 0
              ? t.code.expiresIn(formatClock(expiresLeft))
              : t.code.expired}
          </span>
          {resendLeft > 0 ? (
            <span className="text-muted-foreground">
              {t.code.resendIn}{" "}
              <strong className="tabular-nums">
                {formatClock(resendLeft)}
              </strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="text-primary font-semibold hover:underline disabled:opacity-60"
            >
              {t.code.resend}
            </button>
          )}
        </div>
        <PrimaryButton
          type="submit"
          ur={t.code.submitUr}
          disabled={expiresLeft === 0}
        >
          {t.code.submit}
        </PrimaryButton>
      </form>
      <p className="text-muted-foreground text-center text-[13px]">
        {t.code.didntGet}{" "}
        <button
          type="button"
          onClick={() => onChangeNumber(otherChannel)}
          className="text-primary font-semibold hover:underline"
        >
          {otherChannel === "sms" ? t.code.sendBySms : t.code.sendByWhatsapp}
        </button>
        .
      </p>
    </AuthCard>
  );
}

function PasswordStep({
  sent,
  code,
  onBack,
  onInvalidCode,
  onDone,
}: {
  sent: Sent;
  code: string;
  onBack: () => void;
  onInvalidCode: (message: string) => void;
  onDone: (revokedSessions: number) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit(async ({ newPassword }) => {
    setFormError(null);
    try {
      const result = await resetPassword({
        phone: sent.phone,
        code,
        newPassword,
      });
      onDone(result.revokedSessions);
    } catch (error) {
      const e = toApiError(error);
      if (
        e.code === "INVALID_OTP" ||
        e.errors.some((f) => f.field === "code")
      ) {
        onInvalidCode(t.errors.invalidOtp);
        return;
      }
      const fieldError = e.errors.find((f) => f.field === "newPassword");
      if (fieldError)
        form.setError("newPassword", {
          type: "server",
          message: fieldError.message,
        });
      else setFormError(errorMessage(error));
    }
  });

  return (
    <AuthCard>
      <BackButton onClick={onBack}>{t.back}</BackButton>
      <StepIndicator step={3} label={t.step(3)} />
      <CardHeading
        size="md"
        title={t.newPassword.title}
        ur={t.newPassword.ur}
      />
      {formError ? <FormMessage>{formError}</FormMessage> : null}
      <FormProvider {...form}>
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <NewPasswordFields idPrefix="np" />
          <PrimaryButton
            type="submit"
            disabled={form.formState.isSubmitting}
            pending={form.formState.isSubmitting}
            ur={t.newPassword.submitUr}
          >
            {form.formState.isSubmitting
              ? t.newPassword.submitting
              : t.newPassword.submit}
          </PrimaryButton>
        </form>
      </FormProvider>
    </AuthCard>
  );
}
