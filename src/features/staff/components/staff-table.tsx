"use client";

import { MoreHorizontal, UserCheck, UserCog, UserX, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { toApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { type StaffStatusAction, useStaff } from "../hooks";
import { staffText } from "../text";
import type { StaffMember } from "../types";
import { ActiveBadge, RoleBadge } from "./badges";
import { ChangeRoleDialog } from "./change-role-dialog";
import { StatusDialog } from "./status-dialog";
import { useClientPage } from "./use-client-page";

const t = staffText.table;

type OpenDialog =
  | { kind: "role"; member: StaffMember }
  | { kind: "status"; member: StaffMember; action: StaffStatusAction };

function RowActions({
  member,
  onOpen,
}: {
  member: StaffMember;
  onOpen: (dialog: OpenDialog) => void;
}) {
  const a = staffText.actions;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={a.menu(member.name)}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem onSelect={() => onOpen({ kind: "role", member })}>
          <UserCog aria-hidden />
          {a.changeRole}
        </DropdownMenuItem>
        {member.isActive ? (
          member.isYou ? (
            // The server refuses too (CANNOT_DEACTIVATE_SELF).
            <DropdownMenuItem disabled className="flex-col items-start gap-0">
              <span className="flex items-center gap-2">
                <UserX aria-hidden />
                {a.deactivate}
              </span>
              <span className="text-muted-foreground ps-6 text-xs">
                {a.cantDeactivateSelf}
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() =>
                onOpen({ kind: "status", member, action: "deactivate" })
              }
            >
              <UserX aria-hidden />
              {a.deactivate}
            </DropdownMenuItem>
          )
        ) : (
          <DropdownMenuItem
            onSelect={() =>
              onOpen({ kind: "status", member, action: "activate" })
            }
          >
            <UserCheck aria-hidden />
            {a.activate}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const col = dataTableColumnHelper<StaffMember>();

function staffColumns(
  onOpen: (dialog: OpenDialog) => void,
): DataTableColumn<StaffMember>[] {
  return col.columns([
    col.accessor("name", {
      header: t.name,
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {row.original.name}
          {row.original.isYou ? (
            <Badge variant="secondary" className="font-semibold">
              {t.you}
            </Badge>
          ) : null}
        </span>
      ),
    }),
    col.accessor("phone", {
      header: t.phone,
      cell: ({ getValue }) => (
        <span dir="ltr" className="tabular-nums">
          {getValue()}
        </span>
      ),
    }),
    col.accessor("role", {
      header: t.role,
      cell: ({ getValue }) => <RoleBadge role={getValue()} />,
    }),
    col.accessor("isActive", {
      header: t.status,
      cell: ({ row }) => (
        <span className="flex flex-col items-start gap-1">
          <ActiveBadge active={row.original.isActive} />
          {row.original.isActive && row.original.mustChangePassword ? (
            <span className="text-muted-foreground text-xs">
              {t.mustChangePassword}
            </span>
          ) : null}
        </span>
      ),
    }),
    col.accessor("lastLoginAt", {
      header: t.lastLogin,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? (
          <time dateTime={value}>{formatDateTime(value)}</time>
        ) : (
          <span className="text-muted-foreground">{t.never}</span>
        );
      },
    }),
    col.display({
      id: "actions",
      header: () => <span className="sr-only">{t.actions}</span>,
      cell: ({ row }) => <RowActions member={row.original} onOpen={onOpen} />,
      meta: { align: "end", className: "w-14" },
    }),
  ]);
}

/** Staff tab: everyone in the shop with role, status and last login. */
export function StaffTable() {
  const query = useStaff();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const columns = useMemo(() => staffColumns(setDialog), []);
  const paged = useClientPage(query.data);

  if (query.isError && toApiError(query.error).status === 403) {
    return <ForbiddenState />;
  }

  const close = () => setDialog(null);

  return (
    <>
      <DataTable<StaffMember>
        caption={t.caption}
        columns={columns}
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
            icon={Users}
            title={t.emptyTitle}
            body={t.emptyBody}
            className="rounded-none border-0"
          />
        }
      />
      {dialog?.kind === "role" ? (
        <ChangeRoleDialog member={dialog.member} onClose={close} />
      ) : null}
      {dialog?.kind === "status" ? (
        <StatusDialog
          member={dialog.member}
          action={dialog.action}
          onClose={close}
        />
      ) : null}
    </>
  );
}
