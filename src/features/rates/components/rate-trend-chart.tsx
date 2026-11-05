"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Commodity } from "@/features/commodities/types";
import { formatDate, formatRs } from "@/lib/format";
import { useRateHistory } from "../hooks";
import { rateText } from "../text";
import {
  type TrendPoint,
  type TrendRange,
  trendRanges,
  trendSeries,
  trendStart,
  trendUnit,
} from "../trend";

const t = rateText.chart;

/** "6 Nov": a calendar date, so formatted in UTC (no zone shift). */
const tickDate = new Intl.DateTimeFormat("en-PK", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const tickLabel = (date: string) =>
  tickDate.format(new Date(`${date}T00:00:00Z`));

/** Axis ticks only: "4,200" from the plot position. */
const axisNumber = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

export interface RateTrendChartProps {
  /** Commodities to choose from, in name order. */
  commodities: Commodity[];
  /** Today (Asia/Karachi) as the server sees it: the end of every period. */
  today: string;
}

/**
 * One commodity's rate over the last 7, 30 or 90 days: the avg rate as a
 * line over the min–max band. A day without a rate is a gap, never a zero.
 */
export function RateTrendChart({ commodities, today }: RateTrendChartProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [days, setDays] = useState<TrendRange>(30);
  const commodityId = picked ?? commodities[0]?.id ?? null;
  const from = trendStart(today, days);

  const history = useRateHistory(
    commodityId ? { commodity: commodityId, from, to: today } : null,
  );
  const rates = history.data ?? [];
  const series = trendSeries(rates, from, today);

  return (
    <section
      aria-labelledby="rate-trend-title"
      className="bg-card text-card-foreground rounded-card flex flex-col gap-4 border p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="rate-trend-title" className="font-heading text-lg font-bold">
          {t.title}
        </h2>
        <p className="text-muted-foreground text-sm">{t.description}</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate-trend-commodity">{t.commodityLabel}</Label>
          <Select
            value={commodityId ?? ""}
            onValueChange={(value) => setPicked(value)}
          >
            <SelectTrigger id="rate-trend-commodity" className="min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {commodities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          role="group"
          aria-label={t.rangeLabel}
          className="flex items-center gap-1"
        >
          {trendRanges.map((range) => (
            <Button
              key={range}
              type="button"
              size="sm"
              variant={range === days ? "default" : "outline"}
              aria-pressed={range === days}
              onClick={() => setDays(range)}
            >
              {t.range(range)}
            </Button>
          ))}
        </div>
      </div>

      {history.isPending && commodityId ? (
        <Skeleton className="h-72 w-full" />
      ) : history.isError ? (
        <p role="alert" className="text-destructive py-12 text-center text-sm">
          {t.loadError}
        </p>
      ) : rates.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t.noData}
        </p>
      ) : (
        <div className="h-72 w-full" dir="ltr" data-testid="rate-trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={series}
              margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={tickLabel}
                tick={{ fontSize: 12 }}
                minTickGap={16}
              />
              <YAxis
                width={72}
                tick={{ fontSize: 12 }}
                tickFormatter={(value: number) => axisNumber.format(value)}
                domain={["auto", "auto"]}
                label={{
                  value: t.axis(trendUnit(rates)),
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12 },
                }}
              />
              <Tooltip content={TrendTooltip} />
              <Area
                dataKey="band"
                name={t.band}
                stroke="none"
                fill="var(--primary)"
                fillOpacity={0.15}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="avg"
                name={t.avg}
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}) {
  const point = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{formatDate(point.date)}</p>
      {point.minRate === null ? (
        <p className="text-muted-foreground">{t.noRate}</p>
      ) : (
        <dl className="grid grid-cols-[auto_auto] gap-x-3">
          <dt>{t.min}</dt>
          <dd className="text-end tabular-nums">{formatRs(point.minRate)}</dd>
          <dt>{t.max}</dt>
          <dd className="text-end tabular-nums">{formatRs(point.maxRate)}</dd>
          <dt>{t.avg}</dt>
          <dd className="text-end tabular-nums">
            {formatRs(point.avgRate) || rateText.none}
          </dd>
        </dl>
      )}
    </div>
  );
}
