"use client";

import { useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { karachiToday } from "@/lib/format";
import { paymentRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { type PaymentDirection, paymentDirections } from "../types";
import { PaymentForm } from "./payment-form";

const directionParser =
  parseAsStringLiteral(paymentDirections).withDefault("paid");

/**
 * `/payments/new?direction=paid|received`: `payment.create` (owner,
 * manager, operator). The voucher type is in the URL, so "Pay kissan" and
 * "Receive from beopari" are links; switching starts a fresh form.
 */
export function NewPaymentPage() {
  const t = useTranslations("payments");
  // Read once: a form left open past midnight keeps its own day.
  const [today] = useState(() => karachiToday());
  const [direction] = useQueryState("direction", directionParser);
  return (
    <RequirePermission permission="payment.create" write>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t(`form.newTitle.${direction}`)}
          description={t(`form.newDescription.${direction}`)}
          actions={<DirectionSwitch direction={direction} />}
        />
        <PaymentForm key={direction} direction={direction} today={today} />
      </div>
    </RequirePermission>
  );
}

const icons = { paid: ArrowUpRight, received: ArrowDownLeft } as const;

function DirectionSwitch({ direction }: { direction: PaymentDirection }) {
  const t = useTranslations("payments");
  return (
    <nav
      aria-label={t("form.directionLabel")}
      className="bg-surface-muted inline-flex rounded-full border p-1"
    >
      {paymentDirections.map((value) => {
        const Icon = icons[value];
        const current = value === direction;
        return (
          <Link
            key={value}
            href={paymentRoutes.new(value)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring/50 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold outline-none focus-visible:ring-3",
              current
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {t(`form.direction.${value}`)}
          </Link>
        );
      })}
    </nav>
  );
}
