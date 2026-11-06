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
import { useCancelSale } from "../hooks";
import { saleText } from "../text";
import type { SaleSummary } from "../types";

const t = saleText.cancel;

/** Confirms `POST /sales/:id/cancel` (owner only, `sale.delete`). */
export function CancelSaleDialog({
  sale,
  onClose,
}: {
  sale: Pick<SaleSummary, "id" | "billNo">;
  onClose: () => void;
}) {
  const mutation = useCancelSale();
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(sale.id, {
      onSuccess: (cancelled) => {
        toast.success(t.done(cancelled.billNo));
        onClose();
      },
      onError: (error) => {
        const e = toApiError(error);
        const errors = saleText.errors;
        toast.error(
          e.status === 0
            ? errors.network
            : e.code === "SALE_CANCELLED"
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
            {t.title(sale.billNo)}
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
