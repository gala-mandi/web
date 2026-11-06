"use client";

import { useTranslations } from "next-intl";
import { Clock, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { formatClock, useCountdown } from "../use-countdown";
import { AuthCard, PrimaryButton, TextLink, SubLine } from "./auth-ui";

interface LockedOutProps {
  seconds: number;
  /** Masked phone/email, e.g. `0300 •••• 567`. */
  who: string | null;
  onUnlock: () => void;
  /** Bumps when a new 429 arrives so the timer restarts. */
  lockId: number;
}

/** 1.3 Too many attempts: countdown from `Retry-After`. */
export function LockedOut({ seconds, who, onUnlock, lockId }: LockedOutProps) {
  const t = useTranslations("auth");
  const left = useCountdown(seconds, lockId);
  const progress = seconds > 0 ? left / seconds : 0;

  useEffect(() => {
    if (left === 0) onUnlock();
  }, [left, onUnlock]);

  return (
    <AuthCard className="items-center text-center">
      <div
        className="flex size-28 items-center justify-center rounded-full"
        style={{
          backgroundImage: `conic-gradient(var(--warning-strong) 0deg ${progress * 360}deg, var(--warning-track) ${progress * 360}deg 360deg)`,
        }}
      >
        <div className="bg-warning-soft text-warning flex size-24 flex-col items-center justify-center gap-0.5 rounded-full">
          <Clock aria-hidden className="size-[22px]" />
          <span
            role="timer"
            aria-label={t("locked.timerLabel")}
            className="font-heading text-2xl font-extrabold tabular-nums"
          >
            {formatClock(left, true)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-[26px] font-extrabold tracking-tight">
          {t("locked.title")}
        </h2>
        <p className="text-muted-foreground text-[15px]/relaxed">
          {who ? t("locked.body", { who }) : t("locked.bodyGeneric")}
        </p>
        <SubLine>{t("locked.subline")}</SubLine>
      </div>
      <div className="bg-background text-foreground/85 flex w-full gap-2.5 rounded-xl px-3.5 py-3 text-start text-[13px]/normal">
        <ShieldCheck
          aria-hidden
          className="text-primary size-[18px] flex-none"
        />
        <span>{t("locked.note")}</span>
      </div>
      <PrimaryButton
        type="button"
        disabled
        className="disabled:bg-surface-muted disabled:text-muted-foreground bg-none shadow-none disabled:opacity-100"
      >
        {t("locked.button", { time: formatClock(left) })}
      </PrimaryButton>
      <div className="flex w-full justify-between gap-3">
        <TextLink href="/forgot-password">{t("locked.resetPassword")}</TextLink>
        <button
          type="button"
          onClick={onUnlock}
          className="text-muted-foreground text-[13px] font-semibold hover:underline"
        >
          {t("locked.backToSignIn")}
        </button>
      </div>
    </AuthCard>
  );
}
