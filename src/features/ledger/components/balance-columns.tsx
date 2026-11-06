"use client";

import Link from "next/link";
import {
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import { TraderTypeBadge } from "@/features/traders/components/badges";
import { TraderName } from "@/features/traders/components/trader-name";
import { ledgerRoutes } from "@/lib/routes";
import { ledgerText } from "../text";
import type { TraderBalance } from "../types";
import { SideAmount } from "./balance-amount";

const t = ledgerText.balances.columns;
const col = dataTableColumnHelper<TraderBalance>();

/** Columns of the balances list; the trader's name opens their khata. */
export const balanceColumns: DataTableColumn<TraderBalance>[] = col.columns([
  col.accessor("name", {
    header: t.name,
    meta: { label: t.name },
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
    header: t.type,
    enableSorting: false,
    meta: { label: t.type },
    cell: ({ getValue }) => <TraderTypeBadge type={getValue()} />,
  }),
  col.accessor("phone", {
    header: t.phone,
    enableSorting: false,
    meta: { label: t.phone },
    cell: ({ getValue }) => (
      <span dir="ltr" className="tabular-nums">
        {getValue()}
      </span>
    ),
  }),
  col.accessor("receivable", {
    header: t.receivable,
    enableSorting: false,
    meta: { align: "end", label: t.receivable },
    cell: ({ getValue }) => <SideAmount amount={getValue()} side="debit" />,
  }),
  col.accessor("payable", {
    header: t.payable,
    enableSorting: false,
    meta: { align: "end", label: t.payable },
    cell: ({ getValue }) => <SideAmount amount={getValue()} side="credit" />,
  }),
]);
