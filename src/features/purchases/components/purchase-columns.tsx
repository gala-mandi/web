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
import { purchaseRoutes } from "@/lib/routes";
import type { PurchaseSummary } from "../types";
import { PurchaseStatusBadge } from "./badges";

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
  const t = useTranslations("purchases");
  const active = purchase.status !== "cancelled";
  return (
    <DataTableRowActions rowName={purchase.billNo}>
      <DropdownMenuItem asChild>
        <Link href={purchaseRoutes.detail(purchase.id)}>
          <Eye aria-hidden />
          {t("actions.view")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => actions.onReprint(purchase)}>
        <Printer aria-hidden />
        {t("actions.reprint")}
      </DropdownMenuItem>
      {actions.canEdit && active ? (
        <DropdownMenuItem asChild>
          <Link href={purchaseRoutes.edit(purchase.id)}>
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
            onSelect={() => actions.onCancel(purchase)}
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
  t: Translator<"purchases">,
  format: Formatters,
  actions: PurchaseRowActions,
): DataTableColumn<PurchaseSummary>[] {
  const { formatDate, formatRs } = format;
  return col.columns([
    col.accessor("billNo", {
      header: t("list.columns.billNo"),
      meta: { label: t("list.columns.billNo") },
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
      header: t("list.columns.purchaseDate"),
      sortDescFirst: true,
      meta: {
        label: t("list.columns.purchaseDate"),
        exportValue: (row: PurchaseSummary) => formatDate(row.purchaseDate),
      },
      cell: ({ getValue }) => (
        <time dateTime={getValue()}>{formatDate(getValue())}</time>
      ),
    }),
    col.accessor((row) => row.trader.name, {
      id: "trader",
      header: t("list.columns.trader"),
      enableSorting: false,
      meta: { label: t("list.columns.trader") },
      cell: ({ getValue }) => <TraderName name={getValue()} />,
    }),
    money(formatRs, "grossAmount", t("list.columns.grossAmount")),
    money(formatRs, "totalDeductions", t("list.columns.totalDeductions")),
    money(formatRs, "netAmount", t("list.columns.netAmount")),
    money(formatRs, "outstanding", t("list.columns.outstanding")),
    col.accessor("status", {
      header: t("list.columns.status"),
      enableSorting: false,
      meta: {
        label: t("list.columns.status"),
        exportValue: (row: PurchaseSummary) => t(`statuses.${row.status}`),
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
