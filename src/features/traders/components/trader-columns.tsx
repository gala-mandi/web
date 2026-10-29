"use client";

import { Eye, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import {
  type DataTableColumn,
  dataTableColumnHelper,
  DataTableRowActions,
} from "@/components/data-table";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatRs } from "@/lib/format";
import { traderRoutes } from "@/lib/routes";
import { balanceTypeText, traderText, traderTypeText } from "../text";
import type { Trader } from "../types";
import { TraderStatusBadge, TraderTypeBadge } from "./badges";
import type { TraderStatusAction } from "./trader-dialogs";
import { TraderName } from "./trader-name";

const t = traderText.list.columns;
const a = traderText.actions;
const col = dataTableColumnHelper<Trader>();

export interface TraderRowActions {
  /** `trader.manage`: Edit, Deactivate / Activate. */
  canManage: boolean;
  /** `trader.delete`. */
  canDelete: boolean;
  onEdit: (trader: Trader) => void;
  onStatus: (trader: Trader, action: TraderStatusAction) => void;
  onDelete: (trader: Trader) => void;
}

function RowActions({
  trader,
  actions,
}: {
  trader: Trader;
  actions: TraderRowActions;
}) {
  return (
    <DataTableRowActions rowName={trader.name}>
      <DropdownMenuItem asChild>
        <Link href={traderRoutes.detail(trader.id)}>
          <Eye aria-hidden />
          {a.view}
        </Link>
      </DropdownMenuItem>
      {actions.canManage ? (
        <>
          <DropdownMenuItem onSelect={() => actions.onEdit(trader)}>
            <Pencil aria-hidden />
            {a.edit}
          </DropdownMenuItem>
          {trader.isActive ? (
            <DropdownMenuItem
              onSelect={() => actions.onStatus(trader, "deactivate")}
            >
              <UserX aria-hidden />
              {a.deactivate}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => actions.onStatus(trader, "activate")}
            >
              <UserCheck aria-hidden />
              {a.activate}
            </DropdownMenuItem>
          )}
        </>
      ) : null}
      {actions.canDelete ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => actions.onDelete(trader)}
          >
            <Trash2 aria-hidden />
            {a.delete}
          </DropdownMenuItem>
        </>
      ) : null}
    </DataTableRowActions>
  );
}

/** Columns of the traders list; only name and added date sort (server-side). */
export function traderColumns(
  actions: TraderRowActions,
): DataTableColumn<Trader>[] {
  return col.columns([
    col.accessor("name", {
      header: t.name,
      meta: {
        label: t.name,
        exportValue: (row: Trader) =>
          row.fatherName
            ? `${row.name} (${traderText.fatherOf(row.fatherName)})`
            : row.name,
      },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={traderRoutes.detail(row.original.id)}
            className="text-foreground focus-visible:ring-ring/50 w-fit rounded-sm font-semibold outline-none hover:underline focus-visible:ring-3"
          >
            <TraderName name={row.original.name} />
          </Link>
          {row.original.fatherName ? (
            <span className="text-muted-foreground text-xs">
              {traderText.fatherPrefix}{" "}
              <TraderName name={row.original.fatherName} />
            </span>
          ) : null}
        </div>
      ),
    }),
    col.accessor("type", {
      header: t.type,
      enableSorting: false,
      meta: {
        label: t.type,
        exportValue: (row: Trader) => traderTypeText[row.type],
      },
      cell: ({ getValue }) => <TraderTypeBadge type={getValue()} />,
    }),
    col.accessor("phone", {
      header: t.phone,
      enableSorting: false,
      meta: { label: t.phone },
      cell: ({ getValue }) =>
        getValue() ? (
          <span dir="ltr" className="tabular-nums">
            {getValue()}
          </span>
        ) : (
          <span className="text-muted-foreground">{traderText.none}</span>
        ),
    }),
    col.accessor("village", {
      header: t.village,
      enableSorting: false,
      meta: { label: t.village },
      cell: ({ getValue }) =>
        getValue() ? (
          <TraderName name={getValue() ?? ""} />
        ) : (
          <span className="text-muted-foreground">{traderText.none}</span>
        ),
    }),
    col.accessor("openingBalance", {
      header: t.openingBalance,
      enableSorting: false,
      meta: {
        align: "end",
        label: t.openingBalance,
        exportValue: (row: Trader) =>
          `${formatRs(row.openingBalance)} ${balanceTypeText[row.openingBalanceType]}`,
      },
      cell: ({ row }) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums" dir="ltr">
            {formatRs(row.original.openingBalance)}
          </span>
          <span className="text-muted-foreground text-xs">
            {balanceTypeText[row.original.openingBalanceType]}
          </span>
        </div>
      ),
    }),
    col.accessor("isActive", {
      id: "status",
      header: t.status,
      enableSorting: false,
      meta: {
        label: t.status,
        exportValue: (row: Trader) =>
          row.isActive ? traderText.active : traderText.inactive,
      },
      cell: ({ getValue }) => <TraderStatusBadge active={getValue()} />,
    }),
    col.accessor("createdAt", {
      header: t.added,
      sortDescFirst: true,
      meta: {
        label: t.added,
        exportValue: (row: Trader) => formatDate(row.createdAt),
      },
      cell: ({ getValue }) => (
        <time dateTime={getValue()} className="text-muted-foreground">
          {formatDate(getValue())}
        </time>
      ),
    }),
    col.display({
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      meta: { align: "end", className: "w-12" },
      cell: ({ row }) => <RowActions trader={row.original} actions={actions} />,
    }),
  ]);
}
