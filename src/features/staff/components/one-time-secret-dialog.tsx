"use client";

import { bidi } from "@/i18n/bidi";
import { useTranslations } from "next-intl";
import {
  Copy,
  KeyRound,
  Link2,
  MessageCircle,
  TriangleAlert,
} from "lucide-react";
import { useId, useRef } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { StaffTranslator } from "../schemas";
import type { InviteResult } from "../types";

/** `https://wa.me/?text=…`: opens WhatsApp with the message, no number. */
export function whatsappShareUrl(
  t: StaffTranslator,
  inviteUrl: string,
): string {
  return `https://wa.me/?text=${encodeURIComponent(t("oneTime.whatsappMessage", { url: inviteUrl }))}`;
}

/**
 * Shows a new invite link or temporary password exactly once, with a copy
 * button (and WhatsApp share for links). The value only lives in the
 * mutation that created it: `onDone` (however the dialog closes) must reset
 * that mutation so it is forgotten. Never written to storage, URL or cache.
 */
export function OneTimeSecretDialog({
  result,
  onDone,
}: {
  result: InviteResult;
  onDone: () => void;
}) {
  const t = useTranslations("staff");
  const copyRef = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  const isLink = result.method === "link";
  const secret = isLink ? result.inviteUrl : result.temporaryPassword;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success(t("oneTime.copied"));
    } catch {
      toast.error(t("oneTime.copyFailed"));
    }
  };

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onDone();
      }}
    >
      <AlertDialogContent
        className="data-[size=default]:sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          copyRef.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-success/10 text-success">
            {isLink ? <Link2 aria-hidden /> : <KeyRound aria-hidden />}
          </AlertDialogMedia>
          <AlertDialogTitle className="font-heading text-lg font-bold">
            {isLink ? t("oneTime.linkTitle") : t("oneTime.passwordTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLink
              ? t("oneTime.linkBody", { phone: result.invitation.phone })
              : t("oneTime.passwordBody", {
                  name: bidi(result.user.name),
                  phone: result.user.phone,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor={inputId} className="text-[13px] font-semibold">
            {isLink ? t("oneTime.linkLabel") : t("oneTime.passwordLabel")}
          </label>
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              readOnly
              value={secret}
              dir="ltr"
              spellCheck={false}
              autoComplete="off"
              onFocus={(event) => event.currentTarget.select()}
              className={
                isLink
                  ? "rounded-field bg-surface-muted focus-visible:ring-ring/15 h-11 min-w-0 flex-1 border px-3.5 text-sm outline-none focus-visible:ring-4"
                  : "rounded-field bg-surface-muted focus-visible:ring-ring/15 h-11 min-w-0 flex-1 border px-3.5 font-mono text-base tracking-wider outline-none focus-visible:ring-4"
              }
            />
            <Button
              ref={copyRef}
              type="button"
              variant="outline"
              className="h-11 gap-2 px-3.5"
              onClick={copy}
            >
              <Copy aria-hidden />
              {t("oneTime.copy")}
            </Button>
          </div>
          {isLink ? (
            <Button asChild variant="outline" className="h-10 gap-2 self-start">
              <a
                href={whatsappShareUrl(t, result.inviteUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden />
                {t("oneTime.whatsapp")}
              </a>
            </Button>
          ) : null}
        </div>

        <p
          role="note"
          className="bg-warning-soft text-warning flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px]/relaxed font-medium"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 flex-none" />
          {t("oneTime.warning")}
        </p>

        <AlertDialogFooter>
          <AlertDialogAction>{t("oneTime.done")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
