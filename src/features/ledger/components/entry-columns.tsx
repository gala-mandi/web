"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import type { Translator } from "@/i18n/types";
import type { Formatters } from "@/lib/use-format";
import { sourceHref, type SourceAccess } from "../sources";
import type { StatementEntry } from "../types";
import { BalanceAmount, SideAmount } from "./balance-amount";
import { SourceBadge } from "./source-badge";

const col = dataTableColumnHelper<StatementEntry>();

/** What a line says: its narration, or the source's name. */
export function entryDetails(
  t: Translator<"ledger">,
  entry: StatementEntry,
): string {
  return entry.narration ?? t(`sources.${entry.sourceType}`);
}

function Details({
  entry,
  access,
}: {
  entry: StatementEntry;
  access: SourceAccess;
}) {
  const t = useTranslations("ledger");
  const href = sourceHref(entry, access);
  const text = entryDetails(t, entry);
  const adjustment = entry.sourceType === "adjustment";
  return (
    <span className="flex flex-col items-start gap-1 whitespace-normal">
      <SourceBadge type={entry.sourceType} />
      {href ? (
        <Link
          href={href}
          aria-label={t("khata.openSource", { label: text })}
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
          {t("khata.adjustmentNote")}
        </span>
      ) : null}
    </span>
  );
}

/** Columns of the khata: date, details (linked to the source), Dr, Cr, balance. */
export function entryColumns(
  t: Translator<"ledger">,
  { formatDate }: Formatters,
  access: SourceAccess,
): DataTableColumn<StatementEntry>[] {
  return col.columns([
    col.accessor("entryDate", {
      header: t("khata.columns.date"),
      enableSorting: false,
      meta: { label: t("khata.columns.date"), className: "w-32" },
      cell: ({ getValue }) => (
        <time dateTime={getValue()} className="whitespace-nowrap">
          {formatDate(getValue())}
        </time>
      ),
    }),
    col.accessor((row) => entryDetails(t, row), {
      id: "details",
      header: t("khata.columns.details"),
      enableSorting: false,
      meta: { label: t("khata.columns.details") },
      cell: ({ row }) => <Details entry={row.original} access={access} />,
    }),
    col.accessor("debit", {
      header: t("khata.columns.debit"),
      enableSorting: false,
      meta: { align: "end", label: t("khata.columns.debit") },
      cell: ({ getValue }) => <SideAmount amount={getValue()} side="debit" />,
    }),
    col.accessor("credit", {
      header: t("khata.columns.credit"),
      enableSorting: false,
      meta: { align: "end", label: t("khata.columns.credit") },
      cell: ({ getValue }) => <SideAmount amount={getValue()} side="credit" />,
    }),
    col.accessor("balance", {
      header: t("khata.columns.balance"),
      enableSorting: false,
      meta: { align: "end", label: t("khata.columns.balance") },
      cell: ({ getValue }) => <BalanceAmount balance={getValue()} />,
    }),
  ]);
}
