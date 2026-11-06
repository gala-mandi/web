"use client";

import { Ban } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { karachiToday } from "@/lib/format";
import { saleRoutes } from "@/lib/routes";
import { useSale } from "../hooks";
import { saleText } from "../text";
import { SaleForm } from "./sale-form";
import { SaleLoadError, SaleSkeleton } from "./sale-view";

const t = saleText.form;

/** `/sales/new`: `sale.create` (owner, manager, operator). */
export function NewSalePage() {
  // Read once: a form left open past midnight keeps its own day.
  const [today] = useState(() => karachiToday());
  return (
    <RequirePermission permission="sale.create">
      <div className="flex flex-col gap-6">
        <PageHeader title={t.newTitle} description={t.newDescription} />
        <SaleForm today={today} />
      </div>
    </RequirePermission>
  );
}

/** `/sales/:id/edit`: `sale.edit` (owner, manager). */
export function EditSalePage({ id }: { id: string }) {
  return (
    <RequirePermission permission="sale.edit">
      <EditSale id={id} />
    </RequirePermission>
  );
}

function EditSale({ id }: { id: string }) {
  const [today] = useState(() => karachiToday());
  const query = useSale(id);

  if (query.isPending) return <SaleSkeleton />;
  if (query.isError) {
    return (
      <SaleLoadError error={query.error} onRetry={() => void query.refetch()} />
    );
  }

  const sale = query.data;
  if (sale.status === "cancelled") {
    return (
      <EmptyState
        role="alert"
        icon={Ban}
        title={saleText.billOf(sale.billNo)}
        body={saleText.errors.cancelled}
        headingLevel="h1"
        action={
          <Button asChild variant="outline">
            <Link href={saleRoutes.detail(sale.id)}>
              {saleText.actions.view}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.editTitle(sale.billNo)}
        description={t.editDescription}
      />
      <SaleForm key={sale.id} today={today} sale={sale} />
    </div>
  );
}
