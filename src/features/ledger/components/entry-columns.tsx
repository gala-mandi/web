"use client";

import Link from "next/link";
import {
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import { formatDate } from "@/lib/format";
import { sourceHref, type SourceAccess } from "../sources";
import { ledgerText, sourceTypeText } from "../text";
import type { StatementEntry } from "../types";
import { BalanceAmount, SideAmount } from "./balance-amount";
import { SourceBadge } from "./source-badge";

const t = ledgerText.khata;
const c = t.columns;
const col = dataTableColumnHelper<StatementEntry>();

/** What a line says: its narration, or the source's name. */
export function entryDetails(entry: StatementEntry): string {
  return entry.narration ?? sourceTypeText[entry.sourceType];
}

function Details({
  entry,
  access,
}: {
  entry: StatementEntry;
  access: SourceAccess;
}) {
  const href = sourceHref(entry, access);
  const text = entryDetails(entry);
  const adjustment = entry.sourceType === "adjustment";
  return (
    <span className="flex flex-col items-start gap-1 whitespace-normal">
      <SourceBadge type={entry.sourceType} />
      {href ? (
        <Link
          href={href}
          aria-label={t.openSource(text)}
          className="text-primary focus-visible:ring-ring/50 rounded-sm font-semibold outline-none hover:underline focus-visible:ring-3"
        >
          <bdi dir="auto">{text}</bdi>
        </Link>
      ) : (
        <bdi dir="auto" className={adjustment ? "font-semibold" : undefined}>
          {text}
        </bdi>
      )}
      {adjustment ? (
        <span className="text-warning text-xs font-semibold">
          {t.adjustmentNote}
        </span>
      ) : null}
    </span>
  );
}

/** Columns of the khata: date, details (linked to the source), Dr, Cr, balance. */
export function entryColumns(
  access: SourceAccess,
): DataTableColumn<StatementEntry>[] {
  return col.columns([
    col.accessor("entryDate", {
      header: c.date,
      enableSorting: false,
      meta: { label: c.date, className: "w-32" },
      cell: ({ getValue }) => (
        <time dateTime={getValue()} className="whitespace-nowrap">
          {formatDate(getValue())}
        </time>
      ),
    }),
    col.accessor((row) => entryDetails(row), {
      id: "details",
      header: c.details,
      enableSorting: false,
      meta: { label: c.details },
      cell: ({ row }) => <Details entry={row.original} access={access} />,
    }),
    col.accessor("debit", {
      header: c.debit,
      enableSorting: false,
      meta: { align: "end", label: c.debit },
      cell: ({ getValue }) => <SideAmount amount={getValue()} side="debit" />,
    }),
    col.accessor("credit", {
      header: c.credit,
      enableSorting: false,
      meta: { align: "end", label: c.credit },
      cell: ({ getValue }) => <SideAmount amount={getValue()} side="credit" />,
    }),
    col.accessor("balance", {
      header: c.balance,
      enableSorting: false,
      meta: { align: "end", label: c.balance },
      cell: ({ getValue }) => <BalanceAmount balance={getValue()} />,
    }),
  ]);
}
