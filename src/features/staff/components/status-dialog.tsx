"use client";

import { bidi } from "@/i18n/bidi";
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
import { generalErrorMessage } from "../form-errors";
import { type StaffStatusAction, useStaffStatus } from "../hooks";
import type { StaffMember } from "../types";

/** Deactivate / Activate confirmation that explains what happens. */
export function StatusDialog({
  member,
  action,
  onClose,
}: {
  member: StaffMember;
  action: StaffStatusAction;
  onClose: () => void;
}) {
  const t = useTranslations("staff");
  const mutation = useStaffStatus();
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(
      { id: member.id, action },
      {
        onSuccess: (updated) => {
          toast.success(
            t(`status.${action}.done`, { name: bidi(updated.name) }),
          );
          onClose();
        },
        onError: (error) => {
          // e.g. CANNOT_DEACTIVATE_SELF or "A shop needs at least one owner".
          toast.error(generalErrorMessage(toApiError(error), t));
        },
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
            {t(`status.${action}.title`, { name: bidi(member.name) })}
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
