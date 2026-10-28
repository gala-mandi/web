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
import { generalErrorMessage } from "../form-errors";
import { type StaffStatusAction, useStaffStatus } from "../hooks";
import { staffText } from "../text";
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
  const mutation = useStaffStatus();
  const t = staffText.status[action];
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(
      { id: member.id, action },
      {
        onSuccess: (updated) => {
          toast.success(t.done(updated.name));
          onClose();
        },
        onError: (error) => {
          // e.g. CANNOT_DEACTIVATE_SELF or "A shop needs at least one owner".
          toast.error(generalErrorMessage(toApiError(error)));
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
            {t.title(member.name)}
          </AlertDialogTitle>
          <AlertDialogDescription>{t.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {staffText.status.cancel}
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
