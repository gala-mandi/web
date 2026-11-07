"use client";

import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import {
  dateFormat,
  isolateClock,
  numberFormat,
  SHOP_TIME_ZONE,
  unitWords,
} from "@/lib/format";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

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

/** A calendar date (`YYYY-MM-DD`), so formatted in UTC (no zone shift). */
const calendarDay = (date: string) => new Date(`${date}T00:00:00Z`);

/**
 * Chart words and numbers in the interface language: "6 Nov" / "6 نومبر",
 * "Fri, 6 Nov 2026", "3:05 pm", axis amounts "1.3M" / "13 لاکھ" (digits
 * follow the switch in `src/i18n/config.ts`, Western by default).
 */
export function chartFormat(locale: Locale) {
  return {
    shortDate: (date: string) =>
      dateFormat(locale, {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
      }).format(calendarDay(date)),
    tooltipDate: (date: string) =>
      dateFormat(locale, {
        timeZone: "UTC",
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(calendarDay(date)),
    clockTime: (ms: number) =>
      isolateClock(
        dateFormat(locale, {
          timeZone: SHOP_TIME_ZONE,
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(ms)),
        locale,
      ),
    axisAmount: (value: number) =>
      numberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value),
  };
}

export function useChartFormat() {
  const locale = useLocale();
  return useMemo(() => chartFormat(locale), [locale]);
}

/**
 * Recharts draws in SVG coordinates, so a chart sits in a `dir="ltr"` box;
 * on the Urdu interface time runs right to left (`reversed` x-axis) and the
 * amount axis stands on the right, as Urdu readers expect.
 */
export function useChartDirection() {
  const rtl = useLocale() === "ur";
  return {
    rtl,
    xAxis: { reversed: rtl },
    yAxis: { orientation: rtl ? ("right" as const) : ("left" as const) },
    margin: rtl
      ? { top: 8, right: 0, bottom: 0, left: 8 }
      : { top: 8, right: 8, bottom: 0, left: 0 },
  };
}

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
  const { formatRs, locale } = useFormat();
  const text = formatRs(value);
  const word = unitWords[locale].rs;
  // "Rs 1,250.50" in English, "1,250.50 روپے" in Urdu.
  const match =
    locale === "ur"
      ? new RegExp(`^(-?)(.+)\\.(\\d{2}) ${word}$`).exec(text)
      : /^(-?)Rs (.+)\.(\d{2})$/.exec(text);
  if (!match) return <span className={className}>{text}</span>;
  const [, sign, whole, paisa] = match;
  const unit = (
    <span
      className={cn(
        "text-muted-foreground text-[0.55em]",
        locale === "ur" ? "font-urdu ms-1.5" : "me-1",
      )}
    >
      {locale === "ur" ? word : `${sign}${word}`}
    </span>
  );
  return (
    <span className={cn("tabular-nums", className)} data-amount={value}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {locale === "ur" ? null : unit}
        <bdi dir="ltr">
          {locale === "ur" ? sign : null}
          {whole}
          <span className="text-muted-foreground text-[0.6em]">.{paisa}</span>
        </bdi>
        {locale === "ur" ? unit : null}
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
  const t = useTranslations("dashboard");
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
        {t("retry")}
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
