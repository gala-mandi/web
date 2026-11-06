"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart, Store, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEveryCommodity } from "@/features/rates/hooks";
import { formatDate, formatRs, karachiToday } from "@/lib/format";
import { panelRoutes, purchaseRoutes, saleRoutes } from "@/lib/routes";
import { useDayBills, useLiveTodayRates } from "../hooks";
import { dashboardText } from "../text";
import { panelClass, SectionEmpty, SectionError } from "./chart-parts";
import { DashboardEmpty, type EmptyStep } from "./dashboard-empty";
import { KpiTile } from "./kpi-tile";
import { RefreshStatus } from "./refresh-status";

const t = dashboardText.operator;
const r = dashboardText.rates;

const operatorSteps: EmptyStep[] = [
  {
    key: "purchase",
    label: t.empty.purchase,
    href: purchaseRoutes.new,
    icon: ShoppingCart,
    permission: "purchase.create",
  },
  {
    key: "sale",
    label: t.empty.sale,
    href: saleRoutes.new,
    icon: Store,
    permission: "sale.create",
  },
  {
    key: "rates",
    label: dashboardText.empty.seeRates,
    href: panelRoutes.rates,
    icon: TrendingUp,
    permission: "rate.view",
  },
];

/**
 * The simpler dashboard for staff without `report.view` (operators): how many
 * purchases and sales were posted today, and today's rates. Only routes an
 * operator may call (`/purchases`, `/sales`, `/rates/today`, `/commodities`);
 * no money totals, which are report data.
 */
export function OperatorDashboard() {
  const tPanel = useTranslations("panel");
  const today = karachiToday();
  const bills = useDayBills(today);
  const rates = useLiveTodayRates();
  const commodities = useEveryCommodity();
  const names = new Map((commodities.data ?? []).map((c) => [c.id, c.name]));
  const dayRates = rates.data?.data ?? [];

  const empty =
    bills.data &&
    rates.data &&
    bills.data.purchases === 0 &&
    bills.data.sales === 0 &&
    dayRates.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tPanel("sections.dashboard.label")}
        description={dashboardText.today(formatDate(`${today}T12:00:00Z`))}
        actions={
          <RefreshStatus
            updatedAt={bills.dataUpdatedAt}
            fetching={(bills.isFetching || rates.isFetching) && !!bills.data}
          />
        }
      />

      {empty ? (
        <DashboardEmpty
          title={t.empty.title}
          body={t.empty.body}
          stepsLabel={dashboardText.empty.steps}
          steps={operatorSteps}
        />
      ) : (
        <>
          <section aria-label={t.tilesLabel}>
            {bills.isError && !bills.data ? (
              <div className="bg-card rounded-card border px-5">
                <SectionError
                  message={t.error}
                  onRetry={() => bills.refetch()}
                />
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <KpiTile
                  id="purchases-today"
                  label={t.purchases}
                  icon={ShoppingCart}
                  tone="primary"
                  loading={!bills.data}
                  value={bills.data?.purchases.toLocaleString("en-PK")}
                  hint={t.postedHint}
                />
                <KpiTile
                  id="sales-today"
                  label={t.sales}
                  icon={Store}
                  tone="orange"
                  loading={!bills.data}
                  value={bills.data?.sales.toLocaleString("en-PK")}
                  hint={t.postedHint}
                />
              </dl>
            )}
          </section>

          <Card
            role="region"
            aria-labelledby="dash-today-rates-title"
            className={panelClass}
            data-testid="today-rates"
          >
            <CardHeader className="px-5">
              <CardTitle
                id="dash-today-rates-title"
                className="font-heading text-lg"
              >
                {t.rates.title}
              </CardTitle>
              <CardDescription>{t.rates.description}</CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              {rates.isError && !rates.data ? (
                <SectionError
                  message={r.error}
                  onRetry={() => rates.refetch()}
                />
              ) : !rates.data ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : dayRates.length === 0 ? (
                <SectionEmpty>{t.rates.empty}</SectionEmpty>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dayRates.map((rate) => (
                    <li
                      key={rate.id}
                      data-commodity={rate.commodityId}
                      className="bg-surface-muted/50 flex flex-col gap-1 rounded-xl border px-4 py-3"
                    >
                      <span className="font-semibold">
                        {names.get(rate.commodityId) ?? r.none}
                      </span>
                      <span className="text-sm tabular-nums">
                        {r.range(
                          formatRs(rate.minRate),
                          formatRs(rate.maxRate),
                        )}{" "}
                        <span className="text-muted-foreground text-xs">
                          {r.unit[rate.rateUnit]}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {r.avg} {formatRs(rate.avgRate) || r.none}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
