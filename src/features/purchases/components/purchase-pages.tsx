"use client";

import { useTranslations } from "next-intl";
import { CircleAlert, Ban } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/features/panel/components/require-permission";
import {
  ForbiddenState,
  NotFoundState,
} from "@/features/panel/components/status-pages";
import { toApiError } from "@/lib/api-error";
import { karachiToday } from "@/lib/format";
import { purchaseRoutes } from "@/lib/routes";
import { usePurchase } from "../hooks";
import { PurchaseForm } from "./purchase-form";
import { PurchaseSkeleton } from "./purchase-view";

/** `/purchases/new`: `purchase.create` (owner, manager, operator). */
export function NewPurchasePage() {
  const t = useTranslations("purchases");
  // Read once: a form left open past midnight keeps its own day.
  const [today] = useState(() => karachiToday());
  return (
    <RequirePermission permission="purchase.create" write>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("form.newTitle")}
          description={t("form.newDescription")}
        />
        <PurchaseForm today={today} />
      </div>
    </RequirePermission>
  );
}

/** `/purchases/:id/edit`: `purchase.edit` (owner, manager). */
export function EditPurchasePage({ id }: { id: string }) {
  return (
    <RequirePermission permission="purchase.edit" write>
      <EditPurchase id={id} />
    </RequirePermission>
  );
}

function EditPurchase({ id }: { id: string }) {
  const t = useTranslations("purchases");
  const [today] = useState(() => karachiToday());
  const query = usePurchase(id);

  if (query.isPending) return <PurchaseSkeleton />;
  if (query.isError) {
    const { status } = toApiError(query.error);
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

  const purchase = query.data;
  if (purchase.status === "cancelled") {
    return (
      <EmptyState
        role="alert"
        icon={Ban}
        title={t("billOf", { billNo: purchase.billNo })}
        body={t("errors.cancelled")}
        headingLevel="h1"
        action={
          <Button asChild variant="outline">
            <Link href={purchaseRoutes.detail(purchase.id)}>
              {t("actions.view")}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("form.editTitle", { billNo: purchase.billNo })}
        description={t("form.editDescription")}
      />
      <PurchaseForm key={purchase.id} today={today} purchase={purchase} />
    </div>
  );
}
