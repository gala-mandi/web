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
import { useDeleteCommodity, useUpdateCommodity } from "../hooks";
import { commodityText } from "../text";
import type { Commodity } from "../types";

export type CommodityStatusAction = "deactivate" | "activate";

/** Message for an error that isn't about one form field. */
export function commodityErrorMessage(error: ApiError): string {
  if (error.status === 0) return commodityText.errors.network;
  return error.message ?? commodityText.errors.generic;
}

/** Deactivate / Activate confirmation (`PATCH { isActive }`). */
export function CommodityStatusDialog({
  commodity,
  action,
  onClose,
}: {
  commodity: Commodity;
  action: CommodityStatusAction;
  onClose: () => void;
}) {
  const mutation = useUpdateCommodity();
  const t = commodityText.status[action];
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(
      { id: commodity.id, input: { isActive: action === "activate" } },
      {
        onSuccess: (updated) => {
          toast.success(t.done(updated.name));
          onClose();
        },
        onError: (error) =>
          toast.error(commodityErrorMessage(toApiError(error))),
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
            <bdi dir="auto">{t.title(commodity.name)}</bdi>
          </AlertDialogTitle>
          <AlertDialogDescription>{t.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {commodityText.status.cancel}
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
 * Delete confirmation. A commodity used in rates, purchases or sales can't
 * be deleted (`409 COMMODITY_IN_USE`): the server's message is shown in the
 * dialog with a "Deactivate instead" button when the user may deactivate.
 */
export function DeleteCommodityDialog({
  commodity,
  canDeactivate,
  onDeactivate,
  onClose,
}: {
  commodity: Commodity;
  /** `commodity.manage` and the commodity is still active. */
  canDeactivate: boolean;
  onDeactivate: () => void;
  onClose: () => void;
}) {
  const mutation = useDeleteCommodity();
  const t = commodityText.delete;
  const pending = mutation.isPending;
  const [blocked, setBlocked] = useState<string | null>(null);

  const confirm = () => {
    if (pending) return;
    mutation.mutate(commodity.id, {
      onSuccess: () => {
        toast.success(t.done(commodity.name));
        onClose();
      },
      onError: (error) => {
        const e = toApiError(error);
        if (e.status === 409 && e.code === "COMMODITY_IN_USE") {
          setBlocked(e.message ?? t.inUse);
        } else {
          toast.error(commodityErrorMessage(e));
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
            <bdi dir="auto">{t.title(commodity.name)}</bdi>
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
