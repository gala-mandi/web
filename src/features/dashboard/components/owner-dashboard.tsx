"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart, Store, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatDate, karachiToday } from "@/lib/format";
import { panelRoutes, purchaseRoutes, saleRoutes } from "@/lib/routes";
import {
  useDailySummary,
  useOutstanding,
  usePurchasesByDay,
  useSalesByDay,
} from "../hooks";
import { isEmptyShop, trendFrom } from "../series";
import { dashboardText } from "../text";
import { CommodityRates } from "./commodity-rates";
import { DashboardEmpty, type EmptyStep } from "./dashboard-empty";
import { KpiTiles } from "./kpi-tiles";
import { OutstandingList } from "./outstanding-list";
import { RefreshStatus } from "./refresh-status";
import { SalesTrendChart } from "./sales-trend-chart";

const e = dashboardText.empty;

const ownerSteps: EmptyStep[] = [
  {
    key: "rates",
    label: e.setRates,
    href: panelRoutes.rates,
    icon: TrendingUp,
    permission: "rate.manage",
  },
  {
    key: "purchase",
    label: e.purchase,
    href: purchaseRoutes.new,
    icon: ShoppingCart,
    permission: "purchase.create",
  },
  {
    key: "sale",
    label: e.sale,
    href: saleRoutes.new,
    icon: Store,
    permission: "sale.create",
  },
];

/**
 * The owner's (and manager's) dashboard, all from the reports API: today's
 * KPIs from the daily summary, purchases vs sales over 30 days, the rates of
 * the top commodities and the top 10 receivables and payables. Every query
 * refreshes itself every few minutes.
 */
export function OwnerDashboard() {
  const tPanel = useTranslations("panel");
  const today = karachiToday();
  const from = trendFrom(today);
  const summary = useDailySummary();
  const purchases = usePurchasesByDay(from, today);
  const sales = useSalesByDay(from, today);
  const outstanding = useOutstanding();

  const empty =
    summary.data &&
    purchases.data &&
    sales.data &&
    outstanding.data &&
    isEmptyShop(summary.data, purchases.data, sales.data, outstanding.data);

  const fetching =
    summary.isFetching ||
    purchases.isFetching ||
    sales.isFetching ||
    outstanding.isFetching;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tPanel("sections.dashboard.label")}
        description={dashboardText.today(
          formatDate(`${summary.data?.date ?? today}T12:00:00Z`),
        )}
        actions={
          <RefreshStatus
            updatedAt={summary.dataUpdatedAt}
            fetching={fetching && Boolean(summary.data)}
          />
        }
      />

      {empty ? (
        <DashboardEmpty
          title={e.title}
          body={e.body}
          stepsLabel={e.steps}
          steps={ownerSteps}
        />
      ) : (
        <>
          <KpiTiles
            summary={summary.data}
            isError={summary.isError}
            onRetry={() => summary.refetch()}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SalesTrendChart
              className="lg:col-span-2"
              purchases={purchases.data}
              sales={sales.data}
              from={from}
              to={today}
              isPending={purchases.isPending || sales.isPending}
              isError={purchases.isError || sales.isError}
              onRetry={() => {
                if (purchases.isError) void purchases.refetch();
                if (sales.isError) void sales.refetch();
              }}
            />
            <CommodityRates from={from} to={today} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OutstandingList
              kind="receivable"
              side={outstanding.data?.receivable}
              isPending={outstanding.isPending}
              isError={outstanding.isError}
              onRetry={() => outstanding.refetch()}
            />
            <OutstandingList
              kind="payable"
              side={outstanding.data?.payable}
              isPending={outstanding.isPending}
              isError={outstanding.isError}
              onRetry={() => outstanding.refetch()}
            />
          </div>
        </>
      )}
    </div>
  );
}
