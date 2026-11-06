import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { dashboardText } from "../text";

/** Colour of a tile's icon chip and its soft corner glow (theme tokens). */
export const tileTones = {
  primary: {
    chip: "bg-primary text-primary-foreground shadow-button",
    glow: "bg-chart-1/15",
  },
  orange: { chip: "bg-chart-2/12 text-chart-2", glow: "bg-chart-2/12" },
  green: { chip: "bg-success/10 text-success", glow: "bg-chart-3/12" },
  violet: {
    chip: "bg-secondary text-secondary-foreground",
    glow: "bg-chart-4/12",
  },
} as const;

export type TileTone = keyof typeof tileTones;

export interface KpiTileProps {
  /** Used for `data-tile` (tests, e2e). */
  id: string;
  label: string;
  icon: LucideIcon;
  tone: TileTone;
  /** The figure; ignored while loading. */
  value?: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
}

/** One KPI: a shadcn Card with a label, an icon chip, the figure and a hint. */
export function KpiTile({
  id,
  label,
  icon: Icon,
  tone,
  value,
  hint,
  loading = false,
}: KpiTileProps) {
  const { chip, glow } = tileTones[tone];
  return (
    <Card
      data-tile={id}
      className="rounded-card relative isolate min-w-0 gap-3 overflow-hidden p-4 shadow-[0_1px_2px_rgb(30_27_46/0.04),0_8px_24px_-12px_rgb(76_29_149/0.14)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5 dark:shadow-none"
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -end-10 -top-10 -z-10 size-32 rounded-full blur-2xl",
          glow,
        )}
      />
      <dt className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground truncate text-sm font-semibold">
          {label}
        </span>
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            chip,
          )}
        >
          <Icon className="size-[18px]" />
        </span>
      </dt>
      <dd className="flex min-w-0 flex-col gap-1">
        {loading ? (
          <span className="flex h-9 items-center">
            <span className="sr-only">{dashboardText.loading}</span>
            <span
              aria-hidden
              data-testid="kpi-skeleton"
              className="bg-muted block h-7 w-32 animate-pulse rounded-md"
            />
          </span>
        ) : (
          <span
            data-testid="kpi-value"
            className="font-heading text-[1.6rem]/9 font-extrabold tracking-tight break-all"
          >
            {value}
          </span>
        )}
        <span className="text-muted-foreground min-h-4 text-xs">
          {loading ? null : hint}
        </span>
      </dd>
    </Card>
  );
}

/**
 * "13 bills · 546 bags" on one line, or one part per line (`stacked`) for
 * longer parts such as two amounts.
 */
export function HintParts({
  parts,
  stacked = false,
}: {
  parts: string[];
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <span className="flex flex-col">
        {parts.map((part, i) => (
          <span key={`${i}-${part}`}>{part}</span>
        ))}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-x-1.5">
      {parts.map((part, i) => (
        <span key={`${i}-${part}`} className="whitespace-nowrap">
          {i > 0 ? <span aria-hidden>· </span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}
