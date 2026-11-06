"use client";

import { HandCoins, ShoppingBasket, Truck, Wallet } from "lucide-react";
import { useMemo } from "react";
import { HintParts } from "@/features/dashboard/components/kpi-tile";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { useEveryCommodity } from "@/features/rates/hooks";
import { formatRs } from "@/lib/format";
import { useDailySummaryReport } from "../hooks";
import { useReportDay } from "../search-params";
import { dailySummarySheet } from "../sheet";
import { reportText } from "../text";
import { ReportDayFilter } from "./day-filter";
import {
  CardFigure,
  type ReportCard,
  ReportCards,
  ReportFrame,
  useReportShop,
} from "./report-frame";
import { ReportTableView } from "./report-table";

const t = reportText;

/** `/reports/daily-summary`, for `report.view`. */
export function DailySummaryReportPage() {
  return (
    <RequirePermission permission="report.view">
      <DailySummaryReportView />
    </RequirePermission>
  );
}

/** One day (`?date=`, default today): every figure of the day's work. */
function DailySummaryReportView() {
  const day = useReportDay();
  const { shopName, maundKg } = useReportShop();
  const summary = useDailySummaryReport(day.date);
  const commodities = useEveryCommodity();
  const names = useMemo(
    () =>
      new Map(
        (commodities.data ?? []).map((c) => [
          c.id,
          { name: c.name, nameUr: c.nameUr },
        ]),
      ),
    [commodities.data],
  );
  const sheet = useMemo(
    () => (summary.data ? dailySummarySheet(summary.data, names) : null),
    [summary.data, names],
  );

  const s = summary.data;
  const cards: ReportCard[] = s
    ? [
        {
          id: "purchases",
          label: t.daily.purchases.title,
          icon: ShoppingBasket,
          tone: "orange",
          value: <CardFigure>{formatRs(s.purchases.netAmount)}</CardFigure>,
          hint: (
            <HintParts
              parts={[t.bills(s.purchases.bills), t.bags(s.purchases.bags)]}
            />
          ),
        },
        {
          id: "sales",
          label: t.daily.sales.title,
          icon: Truck,
          tone: "green",
          value: <CardFigure>{formatRs(s.sales.netAmount)}</CardFigure>,
          hint: (
            <HintParts parts={[t.bills(s.sales.bills), t.bags(s.sales.bags)]} />
          ),
        },
        {
          id: "commission",
          label: t.daily.commission.title,
          icon: HandCoins,
          tone: "violet",
          value: <CardFigure>{formatRs(s.commission.total)}</CardFigure>,
          hint: t.cards.commissionHint,
        },
        {
          id: "cash",
          label: t.cards.cashInHand,
          icon: Wallet,
          tone: "primary",
          value: <CardFigure>{formatRs(s.cash.closingCash)}</CardFigure>,
          hint: t.daily.cash.title,
        },
      ]
    : [];

  const pairs = sheet?.tables.filter((table) => table.layout === "pairs") ?? [];
  const tables =
    sheet?.tables.filter((table) => table.layout === "table") ?? [];

  return (
    <ReportFrame
      slug="daily-summary"
      query={summary}
      sheet={sheet}
      shopName={shopName}
      maundKg={maundKg}
      filters={
        <ReportDayFilter
          label={t.day.label}
          value={day.value}
          today={day.today}
          onChange={day.setDate}
        />
      }
    >
      <ReportCards cards={cards} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pairs.map((table) => (
          <ReportTableView key={table.id} table={table} maundKg={maundKg} />
        ))}
      </div>
      {tables.map((table) => (
        <ReportTableView
          key={table.id}
          table={table}
          maundKg={maundKg}
          isFetching={summary.isPlaceholderData}
        />
      ))}
    </ReportFrame>
  );
}
