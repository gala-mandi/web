"use client";

import { useTranslations } from "next-intl";
import type { Translator } from "@/i18n/types";
import { ShoppingCart, Store, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { karachiToday } from "@/lib/format";
import { useFormat } from "@/lib/use-format";
import { panelRoutes, purchaseRoutes, saleRoutes } from "@/lib/routes";
import {
  useDailySummary,
  useOutstanding,
  usePurchasesByDay,
  useSalesByDay,
} from "../hooks";
import { isEmptyShop, trendFrom } from "../series";
import { CommodityRates } from "./commodity-rates";
import { DashboardEmpty, type EmptyStep } from "./dashboard-empty";
import { KpiTiles } from "./kpi-tiles";
import { OutstandingList } from "./outstanding-list";
import { RefreshStatus } from "./refresh-status";
import { SalesTrendChart } from "./sales-trend-chart";

const ownerSteps = (t: Translator<"dashboard">): EmptyStep[] => [
  {
    key: "rates",
    label: t("empty.setRates"),
    href: panelRoutes.rates,
    icon: TrendingUp,
    permission: "rate.manage",
  },
  {
    key: "purchase",
    label: t("empty.purchase"),
    href: purchaseRoutes.new,
    icon: ShoppingCart,
    permission: "purchase.create",
  },
  {
    key: "sale",
    label: t("empty.sale"),
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
  const { formatDate } = useFormat();
  const t = useTranslations("dashboard");
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
        description={t("today", {
          date: formatDate(`${summary.data?.date ?? today}T12:00:00Z`),
        })}
        actions={
          <RefreshStatus
            updatedAt={summary.dataUpdatedAt}
            fetching={fetching && Boolean(summary.data)}
          />
        }
      />

      {empty ? (
        <DashboardEmpty
          title={t("empty.title")}
          body={t("empty.body")}
          stepsLabel={t("empty.steps")}
          steps={ownerSteps(t)}
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
