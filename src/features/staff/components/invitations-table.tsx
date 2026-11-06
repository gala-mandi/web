"use client";

import { useTranslations } from "next-intl";
import { Loader2, MailX, RotateCw, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
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
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { useReadOnly } from "@/features/subscription/hooks";
import { toApiError } from "@/lib/api-error";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { generalErrorMessage } from "../form-errors";
import { useCancelInvitation, useInvitations, useInviteStaff } from "../hooks";
import type { StaffTranslator } from "../schemas";
import type { Invitation } from "../types";
import { InvitationStatusBadge, RoleBadge } from "./badges";
import { OneTimeSecretDialog } from "./one-time-secret-dialog";
import { useClientPage } from "./use-client-page";

interface RowHandlers {
  onCancel: (invitation: Invitation) => void;
  onResend: (invitation: Invitation) => void;
  /** Id of the invitation being resent, if any. */
  resendingId: string | null;
}

function canResend(invitation: Invitation) {
  return invitation.status === "pending" || invitation.status === "expired";
}

function RowActions({
  invitation,
  handlers,
}: {
  invitation: Invitation;
  handlers: RowHandlers;
}) {
  const t = useTranslations("staff");
  const resending = handlers.resendingId === invitation.id;
  return (
    <span className="flex justify-end gap-2">
      {canResend(invitation) ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={handlers.resendingId !== null}
          aria-busy={resending || undefined}
          aria-label={`${t("invitations.resend")} ${invitation.phone}`}
          onClick={() => handlers.onResend(invitation)}
        >
          {resending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <RotateCw aria-hidden />
          )}
          {resending ? t("invitations.resending") : t("invitations.resend")}
        </Button>
      ) : null}
      {invitation.status === "pending" ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive gap-1.5"
          aria-label={`${t("invitations.cancel")} ${invitation.phone}`}
          onClick={() => handlers.onCancel(invitation)}
        >
          <MailX aria-hidden />
          {t("invitations.cancel")}
        </Button>
      ) : null}
    </span>
  );
}

const col = dataTableColumnHelper<Invitation>();

function invitationColumns(
  t: StaffTranslator,
  handlers: RowHandlers,
): DataTableColumn<Invitation>[] {
  return col.columns([
    col.accessor("phone", {
      header: t("invitations.phone"),
      cell: ({ getValue }) => (
        <span dir="ltr" className="font-semibold tabular-nums">
          {getValue()}
        </span>
      ),
    }),
    col.accessor("role", {
      header: t("invitations.role"),
      cell: ({ getValue }) => <RoleBadge role={getValue()} />,
    }),
    col.accessor("status", {
      header: t("invitations.status"),
      cell: ({ getValue }) => <InvitationStatusBadge status={getValue()} />,
    }),
    col.accessor("expiresAt", {
      header: t("invitations.expires"),
      cell: ({ row }) => {
        const { expiresAt, status } = row.original;
        const live = status === "pending" || status === "expired";
        return (
          <span className="flex flex-col">
            {live ? (
              <span className="font-medium">{formatRelative(expiresAt)}</span>
            ) : null}
            <time
              dateTime={expiresAt}
              title={formatDateTime(expiresAt)}
              className="text-muted-foreground text-xs"
            >
              {formatDate(expiresAt)}
            </time>
          </span>
        );
      },
    }),
    col.accessor("createdAt", {
      header: t("invitations.sent"),
      cell: ({ getValue }) => (
        <time dateTime={getValue()}>{formatDateTime(getValue())}</time>
      ),
    }),
    col.display({
      id: "actions",
      header: () => <span className="sr-only">{t("invitations.actions")}</span>,
      cell: ({ row }) => (
        <RowActions invitation={row.original} handlers={handlers} />
      ),
      meta: { align: "end" },
    }),
  ]);
}

function CancelDialog({
  invitation,
  onClose,
}: {
  invitation: Invitation;
  onClose: () => void;
}) {
  const t = useTranslations("staff");
  const mutation = useCancelInvitation();
  const pending = mutation.isPending;

  const confirm = () => {
    if (pending) return;
    mutation.mutate(invitation.id, {
      onSuccess: () => {
        toast.success(t("invitations.cancelDialog.done"));
        onClose();
      },
      onError: (error) =>
        toast.error(generalErrorMessage(toApiError(error), t)),
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
            {t("invitations.cancelDialog.title", { phone: invitation.phone })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("invitations.cancelDialog.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("invitations.cancelDialog.keep")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={confirm}
            className="gap-2"
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending
              ? t("invitations.cancelDialog.pending")
              : t("invitations.cancelDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Invitations tab: cancel pending ones, resend pending or expired ones. */
export function InvitationsTable() {
  const t = useTranslations("staff");
  const query = useInvitations();
  const resend = useInviteStaff();
  const [cancelling, setCancelling] = useState<Invitation | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const paged = useClientPage(query.data);
  const sendAgain = resend.mutate;

  const columns = useMemo(
    () =>
      invitationColumns(t, {
        resendingId,
        onCancel: setCancelling,
        onResend: (invitation) => {
          setResendingId(invitation.id);
          // Same phone + role: the server replaces the old invite.
          sendAgain(
            { phone: invitation.phone, role: invitation.role, method: "link" },
            {
              onSuccess: () => toast.success(t("invitations.resent")),
              onError: (error) =>
                toast.error(generalErrorMessage(toApiError(error), t)),
              onSettled: () => setResendingId(null),
            },
          );
        },
      }),
    [resendingId, sendAgain, t],
  );
  // Read-only shop: no role, activate or cancel buttons (the server refuses).
  const readOnly = useReadOnly();
  const visibleColumns = useMemo(
    () => (readOnly ? columns.filter((c) => c.id !== "actions") : columns),
    [columns, readOnly],
  );

  if (query.isError && toApiError(query.error).status === 403) {
    return <ForbiddenState />;
  }

  return (
    <>
      <DataTable<Invitation>
        caption={t("invitations.caption")}
        columns={visibleColumns}
        data={paged.page}
        getRowId={(row) => row.id}
        rowCount={paged.rowCount}
        pagination={paged.pagination}
        onPaginationChange={paged.onPaginationChange}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        empty={
          <EmptyState
            icon={Send}
            title={t("invitations.emptyTitle")}
            body={t("invitations.emptyBody")}
            className="rounded-none border-0"
          />
        }
      />
      {cancelling ? (
        <CancelDialog
          invitation={cancelling}
          onClose={() => setCancelling(null)}
        />
      ) : null}
      {resend.data ? (
        <OneTimeSecretDialog
          result={resend.data}
          onDone={() => resend.reset()}
        />
      ) : null}
    </>
  );
}
