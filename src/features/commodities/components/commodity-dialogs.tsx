"use client";

import { useTranslations } from "next-intl";
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
import type { CommoditiesTranslator } from "../schemas";
import type { Commodity } from "../types";

export type CommodityStatusAction = "deactivate" | "activate";

/** Message for an error that isn't about one form field. */
export function commodityErrorMessage(
  error: ApiError,
  t: CommoditiesTranslator,
): string {
  if (error.status === 0) return t("errors.network");
  return error.message ?? t("errors.generic");
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
  const t = useTranslations("commodities");
  const mutation = useUpdateCommodity();
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(
      { id: commodity.id, input: { isActive: action === "activate" } },
      {
        onSuccess: (updated) => {
          toast.success(t(`status.${action}.done`, { name: updated.name }));
          onClose();
        },
        onError: (error) =>
          toast.error(commodityErrorMessage(toApiError(error), t)),
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
            <bdi dir="auto">
              {t(`status.${action}.title`, { name: commodity.name })}
            </bdi>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(`status.${action}.body`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("status.cancel")}
          </AlertDialogCancel>
          <Button
            variant={action === "deactivate" ? "destructive" : "default"}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={confirm}
            className="gap-2"
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending
              ? t(`status.${action}.pending`)
              : t(`status.${action}.confirm`)}
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
  const t = useTranslations("commodities");
  const mutation = useDeleteCommodity();
  const pending = mutation.isPending;
  const [blocked, setBlocked] = useState<string | null>(null);

  const confirm = () => {
    if (pending) return;
    mutation.mutate(commodity.id, {
      onSuccess: () => {
        toast.success(t("delete.done", { name: commodity.name }));
        onClose();
      },
      onError: (error) => {
        const e = toApiError(error);
        if (e.status === 409 && e.code === "COMMODITY_IN_USE") {
          setBlocked(e.message ?? t("delete.inUse"));
        } else {
          toast.error(commodityErrorMessage(e, t));
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
            <bdi dir="auto">{t("delete.title", { name: commodity.name })}</bdi>
          </AlertDialogTitle>
          <AlertDialogDescription>{t("delete.body")}</AlertDialogDescription>
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
            {blocked ? t("delete.close") : t("delete.cancel")}
          </AlertDialogCancel>
          {blocked ? (
            canDeactivate ? (
              <Button variant="destructive" onClick={onDeactivate}>
                {t("delete.deactivateInstead")}
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
              {pending ? t("delete.pending") : t("delete.confirm")}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
