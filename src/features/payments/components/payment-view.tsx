"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, CircleAlert, XCircle } from "lucide-react";
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
import { ParchiDesk } from "@/features/parchi/components/parchi-desk";
import { PurchaseStatusBadge } from "@/features/purchases/components/badges";
import { toApiError } from "@/lib/api-error";
import { useCan } from "@/lib/can";
import { useCanWrite } from "@/features/subscription/hooks";
import { useFormat } from "@/lib/use-format";
import { ledgerRoutes, paymentRoutes } from "@/lib/routes";
import { usePayment } from "../hooks";
import type { Payment } from "../types";
import { voucherWords } from "../voucher-words";
import { DirectionBadge } from "./badges";
import { CancelPaymentDialog } from "./cancel-payment-dialog";
import { VoucherDocument } from "./voucher-document";

/** `/payments/:id`: everyone with `payment.view`. `?print=1` prints it. */
export function PaymentDetailPage({ id }: { id: string }) {
  return (
    <RequirePermission permission="payment.view">
      <PaymentDetail id={id} />
    </RequirePermission>
  );
}

function PaymentDetail({ id }: { id: string }) {
  const t = useTranslations("payments");
  const query = usePayment(id);
  if (query.isPending) {
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
  if (query.isError) {
    const { status } = toApiError(query.error);
    // 400: not a voucher id at all.
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
  return <PaymentView payment={query.data} />;
}

/** The voucher as it prints, with Print, Cancel (owner) and the khata link. */
function PaymentView({ payment }: { payment: Payment }) {
  const { formatDate } = useFormat();
  const t = useTranslations("payments");
  const canCancel = useCanWrite("payment.delete");
  const canOpenKhata = useCan("ledger.view");
  const [cancelling, setCancelling] = useState(false);
  const active = payment.status !== "cancelled";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={paymentRoutes.cashBookOf(payment.paymentDate)}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold outline-none focus-visible:ring-3"
      >
        <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />
        {t("view.back")}
      </Link>

      <PageHeader
        title={t("voucherOf", {
          direction: payment.direction,
          voucherNo: payment.voucherNo,
        })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <DirectionBadge direction={payment.direction} />
            <PurchaseStatusBadge status={payment.status} />
            <span>{formatDate(payment.paymentDate)}</span>
          </span>
        }
        actions={
          canCancel && active ? (
            <Button
              size="lg"
              variant="outline"
              className="text-destructive h-10 gap-2 px-4 font-semibold"
              onClick={() => setCancelling(true)}
            >
              <XCircle aria-hidden />
              {t("actions.cancel")}
            </Button>
          ) : null
        }
      />

      {active ? null : (
        <p role="note" className="text-destructive text-sm font-semibold">
          {t("view.cancelledNote")}
        </p>
      )}

      <ParchiDesk
        docNo={payment.voucherNo}
        label={t("view.preview", { voucherNo: payment.voucherNo })}
        documentTitle={`voucher-${payment.voucherNo}`}
        numberLabel={(lang) => voucherWords[lang].voucherNo}
        printLabel={t("actions.print")}
        aside={
          canOpenKhata ? (
            <Link
              href={ledgerRoutes.khata(payment.trader.id)}
              className="text-primary focus-visible:ring-ring/50 rounded-sm text-sm font-semibold outline-none hover:underline focus-visible:ring-3"
            >
              {t("view.khataLink")}
            </Link>
          ) : null
        }
      >
        {({ ref, shop, lang, paper, printedAt }) => (
          <VoucherDocument
            ref={ref}
            payment={payment}
            shop={shop}
            lang={lang}
            paper={paper}
            printedAt={printedAt}
            printArea
          />
        )}
      </ParchiDesk>

      {cancelling ? (
        <CancelPaymentDialog
          payment={payment}
          onClose={() => setCancelling(false)}
        />
      ) : null}
    </div>
  );
}
