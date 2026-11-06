"use client";

import { Eye, Pencil, Printer, XCircle } from "lucide-react";
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
import { TraderName } from "@/features/traders/components/trader-name";
import { formatDate, formatRs } from "@/lib/format";
import { purchaseRoutes } from "@/lib/routes";
import { purchaseStatusText, purchaseText } from "../text";
import type { PurchaseSummary } from "../types";
import { PurchaseStatusBadge } from "./badges";

const t = purchaseText.list.columns;
const a = purchaseText.actions;
const col = dataTableColumnHelper<PurchaseSummary>();

export interface PurchaseRowActions {
  /** `purchase.edit` (owner, manager). */
  canEdit: boolean;
  /** `purchase.delete` (owner): cancel. */
  canCancel: boolean;
  onCancel: (purchase: PurchaseSummary) => void;
  /** Everyone who sees the list: prints the parchi again (cancelled too). */
  onReprint: (purchase: PurchaseSummary) => void;
}

function RowActions({
  purchase,
  actions,
}: {
  purchase: PurchaseSummary;
  actions: PurchaseRowActions;
}) {
  const active = purchase.status !== "cancelled";
  return (
    <DataTableRowActions rowName={purchase.billNo}>
      <DropdownMenuItem asChild>
        <Link href={purchaseRoutes.detail(purchase.id)}>
          <Eye aria-hidden />
          {a.view}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => actions.onReprint(purchase)}>
        <Printer aria-hidden />
        {a.reprint}
      </DropdownMenuItem>
      {actions.canEdit && active ? (
        <DropdownMenuItem asChild>
          <Link href={purchaseRoutes.edit(purchase.id)}>
            <Pencil aria-hidden />
            {a.edit}
          </Link>
        </DropdownMenuItem>
      ) : null}
      {actions.canCancel && active ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => actions.onCancel(purchase)}
          >
            <XCircle aria-hidden />
            {a.cancel}
          </DropdownMenuItem>
        </>
      ) : null}
    </DataTableRowActions>
  );
}

const money = (
  key: "grossAmount" | "totalDeductions" | "netAmount" | "outstanding",
  header: string,
) =>
  col.accessor(key, {
    header,
    enableSorting: false,
    meta: {
      align: "end",
      label: header,
      exportValue: (row: PurchaseSummary) => formatRs(row[key]),
    },
    cell: ({ getValue }) => (
      <span
        dir="ltr"
        className={
          key === "netAmount" ? "font-semibold tabular-nums" : "tabular-nums"
        }
      >
        {formatRs(getValue())}
      </span>
    ),
  });

/** Columns of the purchases list; bill number and date sort (server-side). */
export function purchaseColumns(
  actions: PurchaseRowActions,
): DataTableColumn<PurchaseSummary>[] {
  return col.columns([
    col.accessor("billNo", {
      header: t.billNo,
      meta: { label: t.billNo },
      cell: ({ row }) => (
        <Link
          href={purchaseRoutes.detail(row.original.id)}
          dir="ltr"
          className="text-foreground focus-visible:ring-ring/50 rounded-sm font-semibold tabular-nums outline-none hover:underline focus-visible:ring-3"
        >
          {row.original.billNo}
        </Link>
      ),
    }),
    col.accessor("purchaseDate", {
      header: t.purchaseDate,
      sortDescFirst: true,
      meta: {
        label: t.purchaseDate,
        exportValue: (row: PurchaseSummary) => formatDate(row.purchaseDate),
      },
      cell: ({ getValue }) => (
        <time dateTime={getValue()}>{formatDate(getValue())}</time>
      ),
    }),
    col.accessor((row) => row.trader.name, {
      id: "trader",
      header: t.trader,
      enableSorting: false,
      meta: { label: t.trader },
      cell: ({ getValue }) => <TraderName name={getValue()} />,
    }),
    money("grossAmount", t.grossAmount),
    money("totalDeductions", t.totalDeductions),
    money("netAmount", t.netAmount),
    money("outstanding", t.outstanding),
    col.accessor("status", {
      header: t.status,
      enableSorting: false,
      meta: {
        label: t.status,
        exportValue: (row: PurchaseSummary) => purchaseStatusText[row.status],
      },
      cell: ({ getValue }) => <PurchaseStatusBadge status={getValue()} />,
    }),
    col.display({
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      meta: { align: "end", className: "w-12" },
      cell: ({ row }) => (
        <RowActions purchase={row.original} actions={actions} />
      ),
    }),
  ]);
}
