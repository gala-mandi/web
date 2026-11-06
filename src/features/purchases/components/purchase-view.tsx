"use client";

import { ArrowLeft, CircleAlert, Pencil, Printer, XCircle } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequirePermission } from "@/features/panel/components/require-permission";
import {
  ForbiddenState,
  NotFoundState,
} from "@/features/panel/components/status-pages";
import { TraderName } from "@/features/traders/components/trader-name";
import { toApiError } from "@/lib/api-error";
import { useCan } from "@/lib/can";
import { formatDate, formatKg, formatMaund, formatRs } from "@/lib/format";
import { purchaseRoutes, traderRoutes } from "@/lib/routes";
import { selectTenant, useSessionStore } from "@/stores/session";
import { usePurchase } from "../hooks";
import { perUnitText, purchaseText } from "../text";
import type { Purchase } from "../types";
import { PurchaseStatusBadge } from "./badges";
import { BreakdownLines } from "./breakdown-lines";
import { CancelPurchaseDialog } from "./cancel-purchase-dialog";

const t = purchaseText.view;
const a = purchaseText.actions;

/** `/purchases/:id`: everyone with `purchase.view`. `?print=1` prints it. */
export function PurchaseDetailPage({ id }: { id: string }) {
  return (
    <RequirePermission permission="purchase.view">
      <PurchaseDetail id={id} />
    </RequirePermission>
  );
}

function PurchaseDetail({ id }: { id: string }) {
  const query = usePurchase(id);

  if (query.isPending) return <PurchaseSkeleton />;
  if (query.isError) {
    const { status } = toApiError(query.error);
    // 400: not a purchase id at all.
    if (status === 404 || status === 400) return <NotFoundState />;
    if (status === 403) return <ForbiddenState />;
    return (
      <EmptyState
        role="alert"
        icon={CircleAlert}
        title={t.error.title}
        body={t.error.body}
        headingLevel="h1"
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t.error.retry}
          </Button>
        }
      />
    );
  }
  return <PurchaseView purchase={query.data} />;
}

export function PurchaseSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <span role="status" className="sr-only">
        {t.loading}
      </span>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="rounded-card h-96" />
    </div>
  );
}

function PurchaseView({ purchase }: { purchase: Purchase }) {
  const canEdit = useCan("purchase.edit");
  const canCancel = useCan("purchase.delete");
  const canOpenTrader = useCan("trader.manage");
  const tenant = useSessionStore(selectTenant);
  const [cancelling, setCancelling] = useState(false);
  const [print, setPrint] = useQueryState("print", parseAsString);
  const printed = useRef(false);
  const active = purchase.status !== "cancelled";

  // "Save & Print" lands here with ?print=1: print once, then drop the flag
  // so a reload doesn't print again.
  useEffect(() => {
    if (print !== "1" || printed.current) return;
    printed.current = true;
    void setPrint(null, { history: "replace" });
    window.print();
  }, [print, setPrint]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={purchaseRoutes.list}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold outline-none focus-visible:ring-3"
      >
        <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />
        {t.back}
      </Link>

      <PageHeader
        title={purchaseText.billOf(purchase.billNo)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <PurchaseStatusBadge status={purchase.status} />
            <span>{formatDate(purchase.purchaseDate)}</span>
          </span>
        }
        actions={
          <>
            <Button
              size="lg"
              variant="outline"
              className="h-10 gap-2 px-4 font-semibold"
              onClick={() => window.print()}
            >
              <Printer aria-hidden />
              {a.print}
            </Button>
            {canEdit && active ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-10 gap-2 px-4 font-semibold"
              >
                <Link href={purchaseRoutes.edit(purchase.id)}>
                  <Pencil aria-hidden />
                  {a.edit}
                </Link>
              </Button>
            ) : null}
            {canCancel && active ? (
              <Button
                size="lg"
                variant="outline"
                className="text-destructive h-10 gap-2 px-4 font-semibold"
                onClick={() => setCancelling(true)}
              >
                <XCircle aria-hidden />
                {a.cancel}
              </Button>
            ) : null}
          </>
        }
      />

      {active ? null : (
        <p role="note" className="text-destructive text-sm font-semibold">
          {t.cancelledNote}
        </p>
      )}

      <article
        data-print-area
        aria-label={purchaseText.billOf(purchase.billNo)}
        className="rounded-card bg-card flex flex-col gap-5 border p-5 sm:p-6"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div className="flex flex-col">
            {tenant ? (
              <p className="font-heading text-xl font-extrabold">
                <bdi dir="auto">{tenant.name}</bdi>
              </p>
            ) : null}
            <p className="text-muted-foreground text-sm">
              {purchaseText.sectionTitle}
            </p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-sm">
            <dt className="text-muted-foreground">{t.billNo}</dt>
            <dd dir="ltr" className="text-end font-semibold tabular-nums">
              {purchase.billNo}
            </dd>
            <dt className="text-muted-foreground">{t.date}</dt>
            <dd className="text-end">{formatDate(purchase.purchaseDate)}</dd>
            <dt className="text-muted-foreground">{t.status}</dt>
            <dd className="text-end">
              <PurchaseStatusBadge status={purchase.status} />
            </dd>
          </dl>
        </header>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p>
            <span className="text-muted-foreground text-sm">{t.trader}: </span>
            <TraderName name={purchase.trader.name} className="font-semibold" />
          </p>
          {canOpenTrader ? (
            <Link
              href={traderRoutes.detail(purchase.trader.id)}
              className="text-primary text-sm font-semibold hover:underline print:hidden"
            >
              {t.khataLink}
            </Link>
          ) : null}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">{purchaseText.form.commodity}</TableHead>
              <TableHead scope="col" className="text-end">
                {purchaseText.form.bags}
              </TableHead>
              <TableHead scope="col" className="text-end">
                {purchaseText.form.weight}
              </TableHead>
              <TableHead scope="col" className="text-end">
                {purchaseText.form.rate}
              </TableHead>
              <TableHead scope="col" className="text-end">
                {purchaseText.form.amount}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchase.items.map((item) => (
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
            {purchase.notes ? (
              <>
                <p className="text-muted-foreground font-semibold">{t.notes}</p>
                <p dir="auto" className="whitespace-pre-line">
                  {purchase.notes}
                </p>
              </>
            ) : null}
          </div>
          <BreakdownLines values={purchase} className="sm:w-80" />
        </div>
      </article>

      {cancelling ? (
        <CancelPurchaseDialog
          purchase={purchase}
          onClose={() => setCancelling(false)}
        />
      ) : null}
    </div>
  );
}
