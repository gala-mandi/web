"use client";

import { useTranslations } from "next-intl";
import type { Translator } from "@/i18n/types";
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
import type { Formatters } from "@/lib/use-format";
import { saleRoutes } from "@/lib/routes";
import { PurchaseStatusBadge } from "@/features/purchases/components/badges";
import type { SaleSummary } from "../types";

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
  const t = useTranslations("sales");
  const active = sale.status !== "cancelled";
  return (
    <DataTableRowActions rowName={sale.billNo}>
      <DropdownMenuItem asChild>
        <Link href={saleRoutes.detail(sale.id)}>
          <Eye aria-hidden />
          {t("actions.view")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => actions.onReprint(sale)}>
        <Printer aria-hidden />
        {t("actions.reprint")}
      </DropdownMenuItem>
      {actions.canEdit && active ? (
        <DropdownMenuItem asChild>
          <Link href={saleRoutes.edit(sale.id)}>
            <Pencil aria-hidden />
            {t("actions.edit")}
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
            {t("actions.cancel")}
          </DropdownMenuItem>
        </>
      ) : null}
    </DataTableRowActions>
  );
}

const money = (
  formatRs: (value: string) => string,
  key: "grossAmount" | "totalCharges" | "netAmount" | "outstanding",
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
        dir="auto"
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
  t: Translator<"sales">,
  tp: Translator<"purchases">,
  format: Formatters,
  actions: SaleRowActions,
): DataTableColumn<SaleSummary>[] {
  const { formatDate, formatRs } = format;
  return col.columns([
    col.accessor("billNo", {
      header: t("list.columns.billNo"),
      meta: { label: t("list.columns.billNo") },
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
      header: t("list.columns.saleDate"),
      sortDescFirst: true,
      meta: {
        label: t("list.columns.saleDate"),
        exportValue: (row: SaleSummary) => formatDate(row.saleDate),
      },
      cell: ({ getValue }) => (
        <time dateTime={getValue()}>{formatDate(getValue())}</time>
      ),
    }),
    col.accessor((row) => row.buyer.name, {
      id: "buyer",
      header: t("list.columns.buyer"),
      enableSorting: false,
      meta: { label: t("list.columns.buyer") },
      cell: ({ getValue }) => <TraderName name={getValue()} />,
    }),
    money(formatRs, "grossAmount", t("list.columns.grossAmount")),
    money(formatRs, "totalCharges", t("list.columns.totalCharges")),
    money(formatRs, "netAmount", t("list.columns.netAmount")),
    money(formatRs, "outstanding", t("list.columns.outstanding")),
    col.accessor("status", {
      header: t("list.columns.status"),
      enableSorting: false,
      meta: {
        label: t("list.columns.status"),
        exportValue: (row: SaleSummary) => tp(`statuses.${row.status}`),
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
