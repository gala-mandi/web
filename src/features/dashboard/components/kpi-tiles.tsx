"use client";

import { BadgePercent, ShoppingCart, Store, Wallet } from "lucide-react";
import { formatRs } from "@/lib/format";
import { dashboardText } from "../text";
import type { DailySummary } from "../types";
import { MoneyFigure, SectionError } from "./chart-parts";
import { KpiTile } from "./kpi-tile";

const t = dashboardText.tiles;

export interface KpiTilesProps {
  /** `GET /reports/daily-summary`; undefined while loading. */
  summary: DailySummary | undefined;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Today's purchases, sales, commission and cash in hand, exactly as the
 * daily summary report sends them: net amounts, `commission.total` and
 * `cash.closingCash`. Nothing is added up in the browser.
 */
export function KpiTiles({ summary, isError, onRetry }: KpiTilesProps) {
  if (isError && !summary) {
    return (
      <section
        aria-label={t.label}
        className="bg-card rounded-card border px-5"
      >
        <SectionError message={t.error} onRetry={() => onRetry?.()} />
      </section>
    );
  }

  const loading = !summary;
  return (
    <section aria-label={t.label}>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiTile
          id="purchases"
          label={t.purchases.title}
          icon={ShoppingCart}
          tone="primary"
          loading={loading}
          value={summary && <MoneyFigure value={summary.purchases.netAmount} />}
          hint={
            summary &&
            t.purchases.hint(
              dashboardText.bills(summary.purchases.bills),
              dashboardText.bags(summary.purchases.bags),
            )
          }
        />
        <KpiTile
          id="sales"
          label={t.sales.title}
          icon={Store}
          tone="orange"
          loading={loading}
          value={summary && <MoneyFigure value={summary.sales.netAmount} />}
          hint={
            summary &&
            t.sales.hint(
              dashboardText.bills(summary.sales.bills),
              dashboardText.bags(summary.sales.bags),
            )
          }
        />
        <KpiTile
          id="commission"
          label={t.commission.title}
          icon={BadgePercent}
          tone="green"
          loading={loading}
          value={summary && <MoneyFigure value={summary.commission.total} />}
          hint={
            summary &&
            t.commission.hint(
              formatRs(summary.commission.purchases),
              formatRs(summary.commission.sales),
            )
          }
        />
        <KpiTile
          id="cash"
          label={t.cash.title}
          icon={Wallet}
          tone="violet"
          loading={loading}
          value={summary && <MoneyFigure value={summary.cash.closingCash} />}
          hint={
            summary &&
            t.cash.hint(
              formatRs(summary.cash.cashIn),
              formatRs(summary.cash.cashOut),
            )
          }
        />
      </dl>
    </section>
  );
}
