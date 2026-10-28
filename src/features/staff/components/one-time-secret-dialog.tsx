"use client";

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
import { oneTimeText as t } from "../text";
import type { InviteResult } from "../types";

/** `https://wa.me/?text=…`: opens WhatsApp with the message, no number. */
export function whatsappShareUrl(inviteUrl: string): string {
  return `https://wa.me/?text=${encodeURIComponent(t.whatsappMessage(inviteUrl))}`;
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
  const copyRef = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  const isLink = result.method === "link";
  const secret = isLink ? result.inviteUrl : result.temporaryPassword;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
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
            {isLink ? t.linkTitle : t.passwordTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLink
              ? t.linkBody(result.invitation.phone)
              : t.passwordBody(result.user.name, result.user.phone)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor={inputId} className="text-[13px] font-semibold">
            {isLink ? t.linkLabel : t.passwordLabel}
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
              {t.copy}
            </Button>
          </div>
          {isLink ? (
            <Button asChild variant="outline" className="h-10 gap-2 self-start">
              <a
                href={whatsappShareUrl(result.inviteUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden />
                {t.whatsapp}
              </a>
            </Button>
          ) : null}
        </div>

        <p
          role="note"
          className="bg-warning-soft text-warning flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px]/relaxed font-medium"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 flex-none" />
          {t.warning}
        </p>

        <AlertDialogFooter>
          <AlertDialogAction>{t.done}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
