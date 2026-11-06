"use client";

import { ArrowLeft, CircleAlert, Pencil, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirePermission } from "@/features/panel/components/require-permission";
import {
  ForbiddenState,
  NotFoundState,
} from "@/features/panel/components/status-pages";
import { PurchaseStatusBadge } from "@/features/purchases/components/badges";
import { toApiError } from "@/lib/api-error";
import { BillParchi } from "@/features/parchi/components/bill-parchi";
import { saleParchi } from "@/features/parchi/parchi";
import { useCan } from "@/lib/can";
import { formatDate, formatRs } from "@/lib/format";
import { saleRoutes, traderRoutes } from "@/lib/routes";
import { useSale } from "../hooks";
import { saleText } from "../text";
import type { Sale } from "../types";
import { CancelSaleDialog } from "./cancel-sale-dialog";

const t = saleText.view;
const a = saleText.actions;

/** `/sales/:id`: everyone with `sale.view`. `?print=1` prints it. */
export function SaleDetailPage({ id }: { id: string }) {
  return (
    <RequirePermission permission="sale.view">
      <SaleDetail id={id} />
    </RequirePermission>
  );
}

/** The error states of a page that loads one sale. */
export function SaleLoadError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const { status } = toApiError(error);
  // 400: not a sale id at all.
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
        <Button variant="outline" onClick={onRetry}>
          {t.error.retry}
        </Button>
      }
    />
  );
}

function SaleDetail({ id }: { id: string }) {
  const query = useSale(id);
  if (query.isPending) return <SaleSkeleton />;
  if (query.isError) {
    return (
      <SaleLoadError error={query.error} onRetry={() => void query.refetch()} />
    );
  }
  return <SaleView sale={query.data} />;
}

export function SaleSkeleton() {
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

function SaleView({ sale }: { sale: Sale }) {
  const canEdit = useCan("sale.edit");
  const canCancel = useCan("sale.delete");
  const canOpenTrader = useCan("trader.manage");
  const [cancelling, setCancelling] = useState(false);
  const active = sale.status !== "cancelled";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={saleRoutes.list}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold outline-none focus-visible:ring-3"
      >
        <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />
        {t.back}
      </Link>

      <PageHeader
        title={saleText.billOf(sale.billNo)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <PurchaseStatusBadge status={sale.status} />
            <span>{formatDate(sale.saleDate)}</span>
            {active ? (
              <span data-testid="bill-outstanding">
                {t.outstanding}:{" "}
                <span dir="ltr" className="text-foreground font-semibold">
                  {formatRs(sale.outstanding)}
                </span>
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            {canEdit && active ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-10 gap-2 px-4 font-semibold"
              >
                <Link href={saleRoutes.edit(sale.id)}>
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

      <BillParchi
        bill={saleParchi(sale)}
        aside={
          canOpenTrader ? (
            <Link
              href={traderRoutes.detail(sale.buyer.id)}
              className="text-primary focus-visible:ring-ring/50 rounded-sm text-sm font-semibold outline-none hover:underline focus-visible:ring-3"
            >
              {t.khataLink}
            </Link>
          ) : null
        }
      />

      {cancelling ? (
        <CancelSaleDialog sale={sale} onClose={() => setCancelling(false)} />
      ) : null}
    </div>
  );
}
