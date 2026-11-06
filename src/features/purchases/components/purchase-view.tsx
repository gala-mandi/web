"use client";

import { useTranslations } from "next-intl";
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
import { toApiError } from "@/lib/api-error";
import { BillParchi } from "@/features/parchi/components/bill-parchi";
import { purchaseParchi } from "@/features/parchi/parchi";
import { useCan } from "@/lib/can";
import { useCanWrite } from "@/features/subscription/hooks";
import { useFormat } from "@/lib/use-format";
import { purchaseRoutes, traderRoutes } from "@/lib/routes";
import { usePurchase } from "../hooks";
import type { Purchase } from "../types";
import { PurchaseStatusBadge } from "./badges";
import { CancelPurchaseDialog } from "./cancel-purchase-dialog";

/** `/purchases/:id`: everyone with `purchase.view`. `?print=1` prints it. */
export function PurchaseDetailPage({ id }: { id: string }) {
  return (
    <RequirePermission permission="purchase.view">
      <PurchaseDetail id={id} />
    </RequirePermission>
  );
}

function PurchaseDetail({ id }: { id: string }) {
  const t = useTranslations("purchases");
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
        title={t("view.error.title")}
        body={t("view.error.body")}
        headingLevel="h1"
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t("view.error.retry")}
          </Button>
        }
      />
    );
  }
  return <PurchaseView purchase={query.data} />;
}

export function PurchaseSkeleton() {
  const t = useTranslations("purchases");
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <span role="status" className="sr-only">
        {t("view.loading")}
      </span>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="rounded-card h-96" />
    </div>
  );
}

function PurchaseView({ purchase }: { purchase: Purchase }) {
  const { formatDate, formatRs } = useFormat();
  const t = useTranslations("purchases");
  const canEdit = useCanWrite("purchase.edit");
  const canCancel = useCanWrite("purchase.delete");
  const canOpenTrader = useCan("trader.manage");
  const [cancelling, setCancelling] = useState(false);
  const active = purchase.status !== "cancelled";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={purchaseRoutes.list}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold outline-none focus-visible:ring-3"
      >
        <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />
        {t("view.back")}
      </Link>

      <PageHeader
        title={t("billOf", { billNo: purchase.billNo })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <PurchaseStatusBadge status={purchase.status} />
            <span>{formatDate(purchase.purchaseDate)}</span>
            {active ? (
              <span data-testid="bill-outstanding">
                {t("view.outstanding")}:{" "}
                <span dir="ltr" className="text-foreground font-semibold">
                  {formatRs(purchase.outstanding)}
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
                <Link href={purchaseRoutes.edit(purchase.id)}>
                  <Pencil aria-hidden />
                  {t("actions.edit")}
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
                {t("actions.cancel")}
              </Button>
            ) : null}
          </>
        }
      />

      {active ? null : (
        <p role="note" className="text-destructive text-sm font-semibold">
          {t("view.cancelledNote")}
        </p>
      )}

      <BillParchi
        bill={purchaseParchi(purchase)}
        aside={
          canOpenTrader ? (
            <Link
              href={traderRoutes.detail(purchase.trader.id)}
              className="text-primary focus-visible:ring-ring/50 rounded-sm text-sm font-semibold outline-none hover:underline focus-visible:ring-3"
            >
              {t("view.khataLink")}
            </Link>
          ) : null
        }
      />

      {cancelling ? (
        <CancelPurchaseDialog
          purchase={purchase}
          onClose={() => setCancelling(false)}
        />
      ) : null}
    </div>
  );
}
