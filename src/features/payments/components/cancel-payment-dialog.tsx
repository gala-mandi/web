"use client";

import { useTranslations } from "next-intl";
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
import type { PaymentSummary } from "../types";

/** Confirms `POST /payments/:id/cancel` (owner only, `payment.delete`). */
export function CancelPaymentDialog({
  payment,
  onClose,
}: {
  payment: Pick<PaymentSummary, "id" | "voucherNo">;
  onClose: () => void;
}) {
  const t = useTranslations("payments");
  const mutation = useCancelPayment();
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(payment.id, {
      onSuccess: (cancelled) => {
        toast.success(t("cancel.done", { voucherNo: cancelled.voucherNo }));
        onClose();
      },
      onError: (error) => {
        const e = toApiError(error);
        toast.error(
          e.status === 0
            ? t("errors.network")
            : e.code === "PAYMENT_CANCELLED"
              ? t("errors.alreadyCancelled")
              : e.status === 403
                ? t("errors.forbidden")
                : (e.message ?? t("errors.generic")),
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
            {t("cancel.title", { voucherNo: payment.voucherNo })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("cancel.body")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("cancel.keep")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={confirm}
            className="gap-2"
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending ? t("cancel.pending") : t("cancel.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
