"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { type DayPoint, dailySeries } from "../series";
import type { BookReport } from "../types";
import {
  axisProps,
  ChartTooltipCard,
  MoneyFigure,
  panelClass,
  SectionEmpty,
  SectionError,
  useChartDirection,
  useChartFormat,
  useChartAnimation,
} from "./chart-parts";

/** Series colours: categorical slots 1 and 2, in fixed order. */
const series = {
  purchases: { color: "var(--chart-1)", gradient: "dash-trend-purchases" },
  sales: { color: "var(--chart-2)", gradient: "dash-trend-sales" },
} as const;

export interface SalesTrendChartProps {
  purchases: BookReport | undefined;
  sales: BookReport | undefined;
  from: string;
  to: string;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  className?: string;
}

/**
 * Net purchases and sales per day over the last 30 days, as two gradient
 * areas on one rupee axis. Days without bills are filled with zero; the
 * legend totals are the reports' own `totals.netAmount`.
 */
export function SalesTrendChart({
  purchases,
  sales,
  from,
  to,
  isPending,
  isError,
  onRetry,
  className,
}: SalesTrendChartProps) {
  const { formatRs } = useFormat();
  const t = useTranslations("dashboard");
  const { shortDate, axisAmount } = useChartFormat();
  const direction = useChartDirection();
  const animation = useChartAnimation();
  const ready = purchases && sales;
  const points = ready ? dailySeries(purchases, sales, from, to) : [];
  const empty = ready && purchases.rows.length === 0 && sales.rows.length === 0;
  const totals = ready
    ? {
        purchases: purchases.totals.netAmount ?? "0.00",
        sales: sales.totals.netAmount ?? "0.00",
      }
    : null;

  return (
    <Card
      role="region"
      aria-labelledby="dash-trend-title"
      className={cn(panelClass, className)}
      data-testid="sales-trend"
    >
      <CardHeader className="px-5">
        <CardTitle id="dash-trend-title" className="font-heading text-lg">
          {t("trend.title")}
        </CardTitle>
        <CardDescription>{t("trend.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 px-5">
        {totals ? (
          <ul className="flex flex-wrap gap-2" aria-label={t("trend.total")}>
            <LegendChip
              id="purchases"
              color={series.purchases.color}
              label={t("trend.purchases")}
              total={totals.purchases}
            />
            <LegendChip
              id="sales"
              color={series.sales.color}
              label={t("trend.sales")}
              total={totals.sales}
            />
          </ul>
        ) : null}

        {isError && !ready ? (
          <SectionError
            message={t("trend.error")}
            onRetry={onRetry}
            className="h-72"
          />
        ) : isPending || !ready ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : empty ? (
          <SectionEmpty className="h-72">{t("trend.empty")}</SectionEmpty>
        ) : (
          <div
            className="min-h-72 w-full flex-1"
            dir="ltr"
            role="img"
            aria-label={t("trend.chartLabel", {
              purchases: formatRs(totals?.purchases),
              sales: formatRs(totals?.sales),
            })}
            data-testid="sales-trend-chart"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={direction.margin}>
                <defs>
                  {Object.values(series).map((s) => (
                    <linearGradient
                      key={s.gradient}
                      id={s.gradient}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={s.color}
                        stopOpacity={0.32}
                      />
                      <stop
                        offset="95%"
                        stopColor={s.color}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  minTickGap={24}
                  tickMargin={8}
                  {...axisProps}
                  {...direction.xAxis}
                />
                <YAxis
                  width={52}
                  tickFormatter={axisAmount}
                  tickMargin={4}
                  {...axisProps}
                  {...direction.yAxis}
                />
                <Tooltip
                  content={<TrendTooltip />}
                  cursor={{
                    stroke: "var(--muted-foreground)",
                    strokeOpacity: 0.4,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="purchasesY"
                  name={t("trend.purchases")}
                  stroke={series.purchases.color}
                  strokeWidth={2}
                  fill={`url(#${series.purchases.gradient})`}
                  dot={false}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: "var(--card)",
                    fill: series.purchases.color,
                  }}
                  {...animation}
                />
                <Area
                  type="monotone"
                  dataKey="salesY"
                  name={t("trend.sales")}
                  stroke={series.sales.color}
                  strokeWidth={2}
                  fill={`url(#${series.sales.gradient})`}
                  dot={false}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: "var(--card)",
                    fill: series.sales.color,
                  }}
                  {...animation}
                  animationBegin={150}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LegendChip({
  id,
  color,
  label,
  total,
}: {
  id: string;
  color: string;
  label: string;
  total: string;
}) {
  return (
    <li
      data-legend={id}
      className="bg-surface-muted/60 flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
    >
      <span
        aria-hidden
        className="size-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-muted-foreground">{label}</span>
      <MoneyFigure value={total} className="font-semibold" />
    </li>
  );
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}) {
  const { formatRs } = useFormat();
  const t = useTranslations("dashboard");
  const { tooltipDate } = useChartFormat();
  const point = payload?.[0]?.payload as DayPoint | undefined;
  if (!active || !point) return null;
  const bills = (n: number) =>
    n === 0 ? t("trend.noBills") : t("bills", { n });
  return (
    <ChartTooltipCard
      title={tooltipDate(point.date)}
      rows={[
        {
          key: "purchases",
          label: t("trend.purchases"),
          value: formatRs(point.purchases),
          hint: bills(point.purchaseBills),
          color: series.purchases.color,
        },
        {
          key: "sales",
          label: t("trend.sales"),
          value: formatRs(point.sales),
          hint: bills(point.saleBills),
          color: series.sales.color,
        },
      ]}
    />
  );
}
