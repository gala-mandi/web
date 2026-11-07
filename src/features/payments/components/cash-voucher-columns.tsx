"use client";

import Link from "next/link";
import {
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import { TraderName } from "@/features/traders/components/trader-name";
import type { Formatters } from "@/lib/use-format";
import { paymentRoutes } from "@/lib/routes";
import type { PaymentsTranslator } from "../schemas";
import type { PaymentSummary } from "../types";
import { DirectionBadge } from "./badges";

const col = dataTableColumnHelper<PaymentSummary>();

/** A receipt's amount is cash in, a payment's cash out. */
const side = (row: PaymentSummary, direction: PaymentSummary["direction"]) =>
  row.direction === direction ? row.amount : null;

function money(
  formatRs: (value: string) => string,
  direction: PaymentSummary["direction"],
  header: string,
) {
  return col.accessor((row) => side(row, direction), {
    id: direction === "received" ? "cashIn" : "cashOut",
    header,
    enableSorting: false,
    meta: { align: "end", label: header },
    cell: ({ getValue }) => {
      const value = getValue();
      return value ? (
        <span dir="auto" className="font-semibold tabular-nums">
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
export function cashVoucherColumns(
  t: PaymentsTranslator,
  { formatDate, formatRs }: Formatters,
): DataTableColumn<PaymentSummary>[] {
  return col.columns([
    col.accessor("voucherNo", {
      header: t("cashBook.vouchers.voucherNo"),
      meta: { label: t("cashBook.vouchers.voucherNo") },
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
      header: t("cashBook.vouchers.date"),
      meta: { label: t("cashBook.vouchers.date") },
      cell: ({ getValue }) => (
        <time dateTime={getValue()} className="whitespace-nowrap">
          {formatDate(getValue())}
        </time>
      ),
    }),
    col.accessor("direction", {
      header: t("cashBook.vouchers.type"),
      enableSorting: false,
      meta: {
        label: t("cashBook.vouchers.type"),
        exportValue: (row: PaymentSummary) => t(`directions.${row.direction}`),
      },
      cell: ({ getValue }) => <DirectionBadge direction={getValue()} />,
    }),
    col.accessor((row) => row.trader.name, {
      id: "trader",
      header: t("cashBook.vouchers.trader"),
      enableSorting: false,
      meta: { label: t("cashBook.vouchers.trader") },
      cell: ({ getValue }) => <TraderName name={getValue()} />,
    }),
    money(formatRs, "received", t("cashBook.vouchers.cashIn")),
    money(formatRs, "paid", t("cashBook.vouchers.cashOut")),
  ]);
}
