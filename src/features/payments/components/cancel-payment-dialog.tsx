"use client";

import { Loader2 } from "lucide-react";
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
import { toApiError } from "@/lib/api-error";
import { useCancelPayment } from "../hooks";
import { paymentText } from "../text";
import type { PaymentSummary } from "../types";

const t = paymentText.cancel;

/** Confirms `POST /payments/:id/cancel` (owner only, `payment.delete`). */
export function CancelPaymentDialog({
  payment,
  onClose,
}: {
  payment: Pick<PaymentSummary, "id" | "voucherNo">;
  onClose: () => void;
}) {
  const mutation = useCancelPayment();
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(payment.id, {
      onSuccess: (cancelled) => {
        toast.success(t.done(cancelled.voucherNo));
        onClose();
      },
      onError: (error) => {
        const e = toApiError(error);
        const errors = paymentText.errors;
        toast.error(
          e.status === 0
            ? errors.network
            : e.code === "PAYMENT_CANCELLED"
              ? errors.alreadyCancelled
              : e.status === 403
                ? errors.forbidden
                : (e.message ?? errors.generic),
        );
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
            {t.title(payment.voucherNo)}
          </AlertDialogTitle>
          <AlertDialogDescription>{t.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.keep}</AlertDialogCancel>
          <Button
            variant="destructive"
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
