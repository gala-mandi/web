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
import { saleRoutes } from "@/lib/routes";
import { PurchaseStatusBadge } from "@/features/purchases/components/badges";
import { purchaseStatusText } from "@/features/purchases/text";
import { saleText } from "../text";
import type { SaleSummary } from "../types";

const t = saleText.list.columns;
const a = saleText.actions;
const col = dataTableColumnHelper<SaleSummary>();

export interface SaleRowActions {
  /** `sale.edit` (owner, manager). */
  canEdit: boolean;
  /** `sale.delete` (owner): cancel. */
  canCancel: boolean;
  onCancel: (sale: SaleSummary) => void;
  /** Everyone who sees the list: prints the parchi again (cancelled too). */
  onReprint: (sale: SaleSummary) => void;
}

function RowActions({
  sale,
  actions,
}: {
  sale: SaleSummary;
  actions: SaleRowActions;
}) {
  const active = sale.status !== "cancelled";
  return (
    <DataTableRowActions rowName={sale.billNo}>
      <DropdownMenuItem asChild>
        <Link href={saleRoutes.detail(sale.id)}>
          <Eye aria-hidden />
          {a.view}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => actions.onReprint(sale)}>
        <Printer aria-hidden />
        {a.reprint}
      </DropdownMenuItem>
      {actions.canEdit && active ? (
        <DropdownMenuItem asChild>
          <Link href={saleRoutes.edit(sale.id)}>
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
            onSelect={() => actions.onCancel(sale)}
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
  key: "grossAmount" | "totalCharges" | "netAmount",
  header: string,
) =>
  col.accessor(key, {
    header,
    enableSorting: false,
    meta: {
      align: "end",
      label: header,
      exportValue: (row: SaleSummary) => formatRs(row[key]),
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

/** Columns of the sales list; bill number and date sort (server-side). */
export function saleColumns(
  actions: SaleRowActions,
): DataTableColumn<SaleSummary>[] {
  return col.columns([
    col.accessor("billNo", {
      header: t.billNo,
      meta: { label: t.billNo },
      cell: ({ row }) => (
        <Link
          href={saleRoutes.detail(row.original.id)}
          dir="ltr"
          className="text-foreground focus-visible:ring-ring/50 rounded-sm font-semibold tabular-nums outline-none hover:underline focus-visible:ring-3"
        >
          {row.original.billNo}
        </Link>
      ),
    }),
    col.accessor("saleDate", {
      header: t.saleDate,
      sortDescFirst: true,
      meta: {
        label: t.saleDate,
        exportValue: (row: SaleSummary) => formatDate(row.saleDate),
      },
      cell: ({ getValue }) => (
        <time dateTime={getValue()}>{formatDate(getValue())}</time>
      ),
    }),
    col.accessor((row) => row.buyer.name, {
      id: "buyer",
      header: t.buyer,
      enableSorting: false,
      meta: { label: t.buyer },
      cell: ({ getValue }) => <TraderName name={getValue()} />,
    }),
    money("grossAmount", t.grossAmount),
    money("totalCharges", t.totalCharges),
    money("netAmount", t.netAmount),
    col.accessor("status", {
      header: t.status,
      enableSorting: false,
      meta: {
        label: t.status,
        exportValue: (row: SaleSummary) => purchaseStatusText[row.status],
      },
      cell: ({ getValue }) => <PurchaseStatusBadge status={getValue()} />,
    }),
    col.display({
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      meta: { align: "end", className: "w-12" },
      cell: ({ row }) => <RowActions sale={row.original} actions={actions} />,
    }),
  ]);
}
