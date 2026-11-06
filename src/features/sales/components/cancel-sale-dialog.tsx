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
import { useCancelSale } from "../hooks";
import type { SaleSummary } from "../types";

/** Confirms `POST /sales/:id/cancel` (owner only, `sale.delete`). */
export function CancelSaleDialog({
  sale,
  onClose,
}: {
  sale: Pick<SaleSummary, "id" | "billNo">;
  onClose: () => void;
}) {
  const t = useTranslations("sales");
  const mutation = useCancelSale();
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(sale.id, {
      onSuccess: (cancelled) => {
        toast.success(t("cancel.done", { billNo: cancelled.billNo }));
        onClose();
      },
      onError: (error) => {
        const e = toApiError(error);
        toast.error(
          e.status === 0
            ? t("errors.network")
            : e.code === "SALE_CANCELLED"
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
            {t("cancel.title", { billNo: sale.billNo })}
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
