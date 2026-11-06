"use client";

import { useTranslations } from "next-intl";
import { BadgePercent, ShoppingCart, Store, Wallet } from "lucide-react";
import { useFormat } from "@/lib/use-format";
import type { DailySummary } from "../types";
import { MoneyFigure, SectionError } from "./chart-parts";
import { HintParts, KpiTile } from "./kpi-tile";

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
  const { formatRs } = useFormat();
  const t = useTranslations("dashboard");
  if (isError && !summary) {
    return (
      <section
        aria-label={t("tiles.label")}
        className="bg-card rounded-card border px-5"
      >
        <SectionError message={t("tiles.error")} onRetry={() => onRetry?.()} />
      </section>
    );
  }

  const loading = !summary;
  return (
    <section aria-label={t("tiles.label")}>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiTile
          id="purchases"
          label={t("tiles.purchases.title")}
          icon={ShoppingCart}
          tone="primary"
          loading={loading}
          value={summary && <MoneyFigure value={summary.purchases.netAmount} />}
          hint={
            summary && (
              <HintParts
                parts={[
                  t("bills", { n: summary.purchases.bills }),
                  t("bags", { n: summary.purchases.bags }),
                ]}
              />
            )
          }
        />
        <KpiTile
          id="sales"
          label={t("tiles.sales.title")}
          icon={Store}
          tone="orange"
          loading={loading}
          value={summary && <MoneyFigure value={summary.sales.netAmount} />}
          hint={
            summary && (
              <HintParts
                parts={[
                  t("bills", { n: summary.sales.bills }),
                  t("bags", { n: summary.sales.bags }),
                ]}
              />
            )
          }
        />
        <KpiTile
          id="commission"
          label={t("tiles.commission.title")}
          icon={BadgePercent}
          tone="green"
          loading={loading}
          value={summary && <MoneyFigure value={summary.commission.total} />}
          hint={
            summary && (
              <HintParts
                stacked
                parts={[
                  t("tiles.commission.purchases", {
                    amount: formatRs(summary.commission.purchases),
                  }),
                  t("tiles.commission.sales", {
                    amount: formatRs(summary.commission.sales),
                  }),
                ]}
              />
            )
          }
        />
        <KpiTile
          id="cash"
          label={t("tiles.cash.title")}
          icon={Wallet}
          tone="violet"
          loading={loading}
          value={summary && <MoneyFigure value={summary.cash.closingCash} />}
          hint={
            summary && (
              <HintParts
                stacked
                parts={[
                  t("tiles.cash.cashIn", {
                    amount: formatRs(summary.cash.cashIn),
                  }),
                  t("tiles.cash.cashOut", {
                    amount: formatRs(summary.cash.cashOut),
                  }),
                ]}
              />
            )
          }
        />
      </dl>
    </section>
  );
}
