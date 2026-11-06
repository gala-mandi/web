"use client";

import Link from "next/link";
import {
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import { TraderName } from "@/features/traders/components/trader-name";
import { formatDate, formatRs } from "@/lib/format";
import { paymentRoutes } from "@/lib/routes";
import { directionText, paymentText } from "../text";
import type { PaymentSummary } from "../types";
import { DirectionBadge } from "./badges";

const t = paymentText.cashBook.vouchers;
const col = dataTableColumnHelper<PaymentSummary>();

/** A receipt's amount is cash in, a payment's cash out. */
const side = (row: PaymentSummary, direction: PaymentSummary["direction"]) =>
  row.direction === direction ? row.amount : null;

function money(direction: PaymentSummary["direction"], header: string) {
  return col.accessor((row) => side(row, direction), {
    id: direction === "received" ? "cashIn" : "cashOut",
    header,
    enableSorting: false,
    meta: { align: "end", label: header },
    cell: ({ getValue }) => {
      const value = getValue();
      return value ? (
        <span dir="ltr" className="font-semibold tabular-nums">
          {formatRs(value)}
        </span>
      ) : (
        <span aria-hidden className="text-muted-foreground">
          —
        </span>
      );
    },
  });
}

/** The cash vouchers behind the cash book; voucher no and date sort. */
export function cashVoucherColumns(): DataTableColumn<PaymentSummary>[] {
  return col.columns([
    col.accessor("voucherNo", {
      header: t.voucherNo,
      meta: { label: t.voucherNo },
      cell: ({ row }) => (
        <Link
          href={paymentRoutes.detail(row.original.id)}
          dir="ltr"
          className="text-foreground focus-visible:ring-ring/50 rounded-sm font-semibold tabular-nums outline-none hover:underline focus-visible:ring-3"
        >
          {row.original.voucherNo}
        </Link>
      ),
    }),
    col.accessor("paymentDate", {
      header: t.date,
      meta: { label: t.date },
      cell: ({ getValue }) => (
        <time dateTime={getValue()} className="whitespace-nowrap">
          {formatDate(getValue())}
        </time>
      ),
    }),
    col.accessor("direction", {
      header: t.type,
      enableSorting: false,
      meta: {
        label: t.type,
        exportValue: (row: PaymentSummary) => directionText[row.direction],
      },
      cell: ({ getValue }) => <DirectionBadge direction={getValue()} />,
    }),
    col.accessor((row) => row.trader.name, {
      id: "trader",
      header: t.trader,
      enableSorting: false,
      meta: { label: t.trader },
      cell: ({ getValue }) => <TraderName name={getValue()} />,
    }),
    money("received", t.cashIn),
    money("paid", t.cashOut),
  ]);
}
