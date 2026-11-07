"use client";

import Link from "next/link";
import type { Translator } from "@/i18n/types";
import {
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import { TraderTypeBadge } from "@/features/traders/components/badges";
import { TraderName } from "@/features/traders/components/trader-name";
import { ledgerRoutes } from "@/lib/routes";
import type { TraderBalance } from "../types";
import { SideAmount } from "./balance-amount";

const col = dataTableColumnHelper<TraderBalance>();

/** Columns of the balances list; the trader's name opens their khata. */
export const balanceColumns = (
  t: Translator<"ledger">,
): DataTableColumn<TraderBalance>[] =>
  col.columns([
    col.accessor("name", {
      header: t("balances.columns.name"),
      meta: { label: t("balances.columns.name") },
      cell: ({ row }) => (
        <Link
          href={ledgerRoutes.khata(row.original.traderId)}
          className="text-foreground focus-visible:ring-ring/50 rounded-sm font-semibold outline-none hover:underline focus-visible:ring-3"
        >
          <TraderName name={row.original.name} />
        </Link>
      ),
    }),
    col.accessor("type", {
      header: t("balances.columns.type"),
      enableSorting: false,
      meta: { label: t("balances.columns.type") },
      cell: ({ getValue }) => <TraderTypeBadge type={getValue()} />,
    }),
    col.accessor("phone", {
      header: t("balances.columns.phone"),
      enableSorting: false,
      meta: { label: t("balances.columns.phone") },
      cell: ({ getValue }) => (
        <span dir="ltr" className="tabular-nums">
          {getValue()}
        </span>
      ),
    }),
    col.accessor("receivable", {
      header: t("balances.columns.receivable"),
      enableSorting: false,
      meta: { align: "end", label: t("balances.columns.receivable") },
      cell: ({ getValue }) => <SideAmount amount={getValue()} side="debit" />,
    }),
    col.accessor("payable", {
      header: t("balances.columns.payable"),
      enableSorting: false,
      meta: { align: "end", label: t("balances.columns.payable") },
      cell: ({ getValue }) => <SideAmount amount={getValue()} side="credit" />,
    }),
  ]);
