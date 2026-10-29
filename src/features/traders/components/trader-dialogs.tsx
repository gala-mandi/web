"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { type ApiError, toApiError } from "@/lib/api-error";
import { useDeleteTrader, useUpdateTrader } from "../hooks";
import { traderText } from "../text";
import type { Trader } from "../types";

export type TraderStatusAction = "deactivate" | "activate";

/** Message for an error that isn't about one form field. */
export function traderErrorMessage(error: ApiError): string {
  if (error.status === 0) return traderText.errors.network;
  return error.message ?? traderText.errors.generic;
}

/** Deactivate / Activate confirmation (`PATCH { isActive }`). */
export function TraderStatusDialog({
  trader,
  action,
  onClose,
}: {
  trader: Trader;
  action: TraderStatusAction;
  onClose: () => void;
}) {
  const mutation = useUpdateTrader();
  const t = traderText.status[action];
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(
      { id: trader.id, input: { isActive: action === "activate" } },
      {
        onSuccess: (updated) => {
          toast.success(t.done(updated.name));
          onClose();
        },
        onError: (error) => toast.error(traderErrorMessage(toApiError(error))),
      },
    );
  };

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-lg font-bold">
            <bdi dir="auto">{t.title(trader.name)}</bdi>
          </AlertDialogTitle>
          <AlertDialogDescription>{t.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {traderText.status.cancel}
          </AlertDialogCancel>
          <Button
            variant={action === "deactivate" ? "destructive" : "default"}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={confirm}
            className="gap-2"
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending ? t.pending : t.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Delete confirmation. A trader with entries can't be deleted (`409
 * TRADER_HAS_TRANSACTIONS`): the server's message is shown in the dialog with
 * a "Deactivate instead" button when the user may deactivate.
 */
export function DeleteTraderDialog({
  trader,
  canDeactivate,
  onDeactivate,
  onClose,
}: {
  trader: Trader;
  /** `trader.manage` and the trader is still active. */
  canDeactivate: boolean;
  onDeactivate: () => void;
  onClose: () => void;
}) {
  const mutation = useDeleteTrader();
  const t = traderText.delete;
  const pending = mutation.isPending;
  const [blocked, setBlocked] = useState<string | null>(null);

  const confirm = () => {
    if (pending) return;
    mutation.mutate(trader.id, {
      onSuccess: () => {
        toast.success(t.done(trader.name));
        onClose();
      },
      onError: (error) => {
        const e = toApiError(error);
        if (e.status === 409 && e.code === "TRADER_HAS_TRANSACTIONS") {
          setBlocked(e.message ?? t.hasTransactions);
        } else {
          toast.error(traderErrorMessage(e));
        }
      },
    });
  };

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-lg font-bold">
            <bdi dir="auto">{t.title(trader.name)}</bdi>
          </AlertDialogTitle>
          <AlertDialogDescription>{t.body}</AlertDialogDescription>
        </AlertDialogHeader>
        {blocked ? (
          <p
            role="alert"
            className="bg-destructive-soft border-destructive-border text-destructive rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
          >
            {blocked}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {blocked ? t.close : t.cancel}
          </AlertDialogCancel>
          {blocked ? (
            canDeactivate ? (
              <Button variant="destructive" onClick={onDeactivate}>
                {t.deactivateInstead}
              </Button>
            ) : null
          ) : (
            <Button
              variant="destructive"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={confirm}
              className="gap-2"
            >
              {pending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : null}
              {pending ? t.pending : t.confirm}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
