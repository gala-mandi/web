"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TraderName } from "@/features/traders/components/trader-name";
import { formatDate, formatKg, formatMaund, formatRs } from "@/lib/format";
import { selectTenant, useSessionStore } from "@/stores/session";
import { perUnitText, purchaseText } from "../text";
import type { PurchaseItem, PurchaseStatus } from "../types";
import { PurchaseStatusBadge } from "./badges";

const t = purchaseText.view;
const f = purchaseText.form;

export interface PrintableBillProps {
  billNo: string;
  /** YYYY-MM-DD. */
  date: string;
  status: PurchaseStatus;
  /** Under the shop name, e.g. "Purchase bill (parchi)". */
  sectionTitle: string;
  /** "Kissan" or "Beopari". */
  partyLabel: string;
  partyName: string;
  /** A link to the trader's khata (left out when the user can't open it). */
  khata?: { href: string; label: string } | null;
  items: readonly Omit<PurchaseItem, "commodityId">[];
  notes: string | null;
  /** The sums, e.g. `<BreakdownLines … />`. */
  breakdown: ReactNode;
}

/**
 * The saved parchi as it prints (purchase or sale): shop name, bill no,
 * date, status, trader, items (bags, `mn + kg`, rate per unit, amount),
 * notes and the sums. Only this `[data-print-area]` prints.
 */
export function PrintableBill({
  billNo,
  date,
  status,
  sectionTitle,
  partyLabel,
  partyName,
  khata,
  items,
  notes,
  breakdown,
}: PrintableBillProps) {
  const tenant = useSessionStore(selectTenant);
  return (
    <article
      data-print-area
      aria-label={purchaseText.billOf(billNo)}
      className="rounded-card bg-card flex flex-col gap-5 border p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="flex flex-col">
          {tenant ? (
            <p className="font-heading text-xl font-extrabold">
              <bdi dir="auto">{tenant.name}</bdi>
            </p>
          ) : null}
          <p className="text-muted-foreground text-sm">{sectionTitle}</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-sm">
          <dt className="text-muted-foreground">{t.billNo}</dt>
          <dd dir="ltr" className="text-end font-semibold tabular-nums">
            {billNo}
          </dd>
          <dt className="text-muted-foreground">{t.date}</dt>
          <dd className="text-end">{formatDate(date)}</dd>
          <dt className="text-muted-foreground">{t.status}</dt>
          <dd className="text-end">
            <PurchaseStatusBadge status={status} />
          </dd>
        </dl>
      </header>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="text-muted-foreground text-sm">{partyLabel}: </span>
          <TraderName name={partyName} className="font-semibold" />
        </p>
        {khata ? (
          <Link
            href={khata.href}
            className="text-primary text-sm font-semibold hover:underline print:hidden"
          >
            {khata.label}
          </Link>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col">{f.commodity}</TableHead>
            <TableHead scope="col" className="text-end">
              {f.bags}
            </TableHead>
            <TableHead scope="col" className="text-end">
              {f.weight}
            </TableHead>
            <TableHead scope="col" className="text-end">
              {f.rate}
            </TableHead>
            <TableHead scope="col" className="text-end">
              {f.amount}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-transparent">
              <TableCell>
                <bdi dir="auto">{item.commodityName}</bdi>
              </TableCell>
              <TableCell dir="ltr" className="text-end tabular-nums">
                {item.bags ?? purchaseText.none}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                <span className="flex flex-col items-end">
                  <span dir="ltr">{formatMaund(item.weightKg)}</span>
                  <span dir="ltr" className="text-muted-foreground text-xs">
                    {formatKg(item.weightKg)}
                  </span>
                </span>
              </TableCell>
              <TableCell className="text-end tabular-nums">
                <span dir="ltr">{formatRs(item.rate)}</span>{" "}
                <span className="text-muted-foreground text-xs">
                  {perUnitText[item.rateUnit]}
                </span>
              </TableCell>
              <TableCell
                dir="ltr"
                className="text-end font-semibold tabular-nums"
              >
                {formatRs(item.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="text-sm sm:max-w-sm">
          {notes ? (
            <>
              <p className="text-muted-foreground font-semibold">{t.notes}</p>
              <p dir="auto" className="whitespace-pre-line">
                {notes}
              </p>
            </>
          ) : null}
        </div>
        {breakdown}
      </div>
    </article>
  );
}
