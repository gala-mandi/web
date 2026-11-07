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
import { useCancelPurchase } from "../hooks";
import type { PurchaseSummary } from "../types";

/** Confirms `POST /purchases/:id/cancel` (owner only, `purchase.delete`). */
export function CancelPurchaseDialog({
  purchase,
  onClose,
}: {
  purchase: Pick<PurchaseSummary, "id" | "billNo">;
  onClose: () => void;
}) {
  const t = useTranslations("purchases");
  const mutation = useCancelPurchase();
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(purchase.id, {
      onSuccess: (cancelled) => {
        toast.success(t("cancel.done", { billNo: cancelled.billNo }));
        onClose();
      },
      onError: (error) => {
        const e = toApiError(error);
        toast.error(
          e.status === 0
            ? t("errors.network")
            : e.code === "PURCHASE_CANCELLED"
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
            {t("cancel.title", { billNo: purchase.billNo })}
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
