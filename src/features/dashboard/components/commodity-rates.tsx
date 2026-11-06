"use client";

import { useTranslations } from "next-intl";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  Area,
  ComposedChart,
  Line,
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
import {
  type TrendPoint,
  trendSeries,
  trendUnit,
} from "@/features/rates/trend";
import type { Rate } from "@/features/rates/types";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { useRateHistories, useTopCommodities } from "../hooks";
import type { TopCommodity } from "../series";
import {
  ChartTooltipCard,
  panelClass,
  SectionEmpty,
  SectionError,
  useChartDirection,
  useChartFormat,
  useChartAnimation,
} from "./chart-parts";

/** One hue for every commodity: each panel is titled, colour adds nothing. */
const COLOR = "var(--chart-1)";

export interface CommodityRatesProps {
  from: string;
  to: string;
  className?: string;
}

/**
 * The rate of the shop's top commodities over the last 30 days, one small
 * chart each (rates differ a lot between commodities and may be per maund or
 * per kg, so they never share an axis): the min–max band as a gradient area
 * and the average as a line. A day without a rate is a gap, never a zero.
 */
export function CommodityRates({ from, to, className }: CommodityRatesProps) {
  const t = useTranslations("dashboard");
  const top = useTopCommodities(from, to);
  const commodities = top.data ?? [];
  const histories = useRateHistories(commodities, from, to);

  return (
    <Card
      role="region"
      aria-labelledby="dash-rates-title"
      className={cn(panelClass, className)}
      data-testid="commodity-rates"
    >
      <CardHeader className="px-5">
        <CardTitle id="dash-rates-title" className="font-heading text-lg">
          {t("rates.title")}
        </CardTitle>
        <CardDescription>{t("rates.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5">
        {top.isError ? (
          <SectionError
            message={t("rates.error")}
            onRetry={() => top.refetch()}
          />
        ) : top.isPending ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : commodities.length === 0 ? (
          <SectionEmpty className="flex-1">{t("rates.empty")}</SectionEmpty>
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {commodities.map((c, i) => (
              <CommodityRow
                key={c.id}
                commodity={c}
                history={histories[i]}
                from={from}
                to={to}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CommodityRow({
  commodity,
  history,
  from,
  to,
}: {
  commodity: TopCommodity;
  history: UseQueryResult<Rate[]> | undefined;
  from: string;
  to: string;
}) {
  const { formatRs } = useFormat();
  const t = useTranslations("dashboard");
  const { shortDate } = useChartFormat();
  const direction = useChartDirection();
  const animation = useChartAnimation();
  const rates = history?.data ?? [];
  const latest = rates.at(-1);
  const points = trendSeries(rates, from, to);
  const gradient = `dash-rate-${commodity.id}`;

  return (
    <li
      data-commodity={commodity.id}
      className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">
          <bdi dir="auto">{commodity.name}</bdi>
        </p>
        {latest ? (
          <p className="text-muted-foreground shrink-0 text-xs">
            {t("rates.latest", { date: shortDate(latest.rateDate) })}
          </p>
        ) : null}
      </div>
      {latest ? (
        <p className="text-sm">
          <span className="font-semibold tabular-nums">
            {t("rates.range", {
              min: formatRs(latest.minRate),
              max: formatRs(latest.maxRate),
            })}
          </span>{" "}
          <span className="text-muted-foreground text-xs">
            {t(`rates.unit.${trendUnit(rates)}`)}
          </span>
        </p>
      ) : null}

      {history?.isError ? (
        <SectionError
          message={t("rates.error")}
          onRetry={() => history.refetch()}
          className="py-4"
        />
      ) : !history || history.isPending ? (
        <Skeleton className="h-20 w-full rounded-lg" />
      ) : rates.length === 0 ? (
        <SectionEmpty className="h-20 py-0">{t("rates.noRates")}</SectionEmpty>
      ) : (
        <div
          className="h-20 w-full"
          dir="ltr"
          role="img"
          aria-label={t("rates.chartLabel", { name: commodity.name })}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={points}
              margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
            >
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLOR} stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide {...direction.xAxis} />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                content={<RateTooltip />}
                cursor={{
                  stroke: "var(--muted-foreground)",
                  strokeOpacity: 0.4,
                  strokeDasharray: "3 3",
                }}
              />
              <Area
                type="monotone"
                dataKey="band"
                name={t("rates.range", {
                  min: t("rates.min"),
                  max: t("rates.max"),
                })}
                stroke="none"
                fill={`url(#${gradient})`}
                connectNulls={false}
                activeDot={false}
                {...animation}
              />
              <Line
                type="monotone"
                dataKey="avg"
                name={t("rates.avg")}
                stroke={COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: "var(--card)",
                  fill: COLOR,
                }}
                connectNulls={false}
                {...animation}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </li>
  );
}

function RateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}) {
  const { formatRs } = useFormat();
  const t = useTranslations("dashboard");
  const { tooltipDate } = useChartFormat();
  const point = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !point) return null;
  if (point.minRate === null) {
    return (
      <ChartTooltipCard
        title={tooltipDate(point.date)}
        rows={[]}
        note={t("rates.noRate")}
      />
    );
  }
  return (
    <ChartTooltipCard
      title={tooltipDate(point.date)}
      rows={[
        { key: "max", label: t("rates.max"), value: formatRs(point.maxRate) },
        {
          key: "avg",
          label: t("rates.avg"),
          value: formatRs(point.avgRate) || t("rates.none"),
          color: COLOR,
        },
        { key: "min", label: t("rates.min"), value: formatRs(point.minRate) },
      ]}
    />
  );
}
