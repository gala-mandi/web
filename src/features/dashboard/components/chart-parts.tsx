"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { formatRs, SHOP_TIME_ZONE } from "@/lib/format";
import { cn } from "@/lib/utils";
import { dashboardText } from "../text";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** `prefers-reduced-motion: reduce`: charts then draw without animating. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

/** Chart entry animation: one smooth ease-out, off for reduced motion. */
export function useChartAnimation() {
  const reduced = useReducedMotion();
  return {
    isAnimationActive: !reduced,
    animationDuration: 900,
    animationEasing: "ease-out",
  } as const;
}

/** "6 Nov": a calendar date, so formatted in UTC (no zone shift). */
const dayMonth = new Intl.DateTimeFormat("en-PK", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
export const shortDate = (date: string) =>
  dayMonth.format(new Date(`${date}T00:00:00Z`));

/** "Fri, 6 Nov 2026": the tooltip's day. */
const longDay = new Intl.DateTimeFormat("en-PK", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
export const tooltipDate = (date: string) =>
  longDay.format(new Date(`${date}T00:00:00Z`));

const clock = new Intl.DateTimeFormat("en-PK", {
  timeZone: SHOP_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
/** "3:05 pm" in Asia/Karachi. */
export const clockTime = (ms: number) => clock.format(new Date(ms));

/** Axis ticks only: "1.3M", "45K" from the plot position. */
const compact = new Intl.NumberFormat("en-PK", {
  notation: "compact",
  maximumFractionDigits: 1,
});
export const axisAmount = (value: number) => compact.format(value);

/** Recharts axis styling shared by every chart: quiet ticks, no lines. */
export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 12, fill: "var(--muted-foreground)" },
} as const;

/**
 * A rupee amount with the "Rs" and the paisa set smaller, e.g.
 * <small>Rs</small> 1,250,000<small>.50</small>. Formatted by `formatRs`.
 */
export function MoneyFigure({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const text = formatRs(value);
  const match = /^(-?)Rs (.+)\.(\d{2})$/.exec(text);
  if (!match) return <span className={className}>{text}</span>;
  const [, sign, whole, paisa] = match;
  return (
    <span className={cn("tabular-nums", className)} data-amount={value}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        <span className="text-muted-foreground me-1 text-[0.55em]">
          {sign}Rs
        </span>
        {whole}
        <span className="text-muted-foreground text-[0.6em]">.{paisa}</span>
      </span>
    </span>
  );
}

export interface TooltipRow {
  key: string;
  label: string;
  /** Already formatted, e.g. "Rs 12,000.00". */
  value: string;
  hint?: string;
  /** A CSS colour (a token), for the dot in front of the label. */
  color?: string;
}

/** The card every dashboard chart shows on hover. */
export function ChartTooltipCard({
  title,
  rows,
  note,
}: {
  title: string;
  rows: TooltipRow[];
  note?: string;
}) {
  return (
    <div className="bg-popover text-popover-foreground min-w-44 rounded-xl border px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold">{title}</p>
      {note ? <p className="text-muted-foreground">{note}</p> : null}
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
        {rows.map((row) => (
          <div key={row.key} className="contents">
            <dt className="text-muted-foreground flex items-center gap-1.5">
              {row.color ? (
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: row.color }}
                />
              ) : null}
              {row.label}
            </dt>
            <dd className="text-end font-semibold tabular-nums">
              {row.value}
              {row.hint ? (
                <span className="text-muted-foreground ms-1.5 font-normal">
                  {row.hint}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A section that couldn't load, with a retry button. */
export function SectionError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-center",
        className,
      )}
    >
      <p className="text-destructive text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {dashboardText.retry}
      </Button>
    </div>
  );
}

/** A quiet one-line empty state inside a card. */
export function SectionEmpty({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground flex items-center justify-center py-10 text-center text-sm",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** The card frame every dashboard panel uses (radius, shadow, hover lift). */
export const panelClass =
  "rounded-card gap-4 border py-5 shadow-[0_1px_2px_rgb(30_27_46/0.04),0_8px_24px_-12px_rgb(76_29_149/0.14)] dark:shadow-none";
