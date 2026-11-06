"use client";

import { CircleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KpiTile,
  type TileTone,
} from "@/features/dashboard/components/kpi-tile";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { useParchiShop } from "@/features/parchi/hooks";
import { toApiError } from "@/lib/api-error";
import type { ReportSlug } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ReportSheet } from "../sheet";
import { reportText } from "../text";
import { ReportActions } from "./report-actions";

/**
 * The shop's name for the report headings and its maund (40 kg unless the
 * owner changed it), from the same source as the parchi header.
 */
export function useReportShop(): { shopName: string | null; maundKg: string } {
  const { shop } = useParchiShop();
  return { shopName: shop.name || null, maundKg: shop.maundKg || "40" };
}

export interface ReportCard {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: TileTone;
  value: ReactNode;
  hint?: ReactNode;
}

/** The totals on top of a report: dashboard-style KPI cards. */
export function ReportCards({ cards }: { cards: ReportCard[] }) {
  return (
    <dl
      data-testid="report-cards"
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        cards.length >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3",
      )}
    >
      {cards.map((card) => (
        <KpiTile
          key={card.id}
          id={card.id}
          label={card.label}
          icon={card.icon}
          tone={card.tone}
          value={card.value}
          hint={card.hint}
        />
      ))}
    </dl>
  );
}

/** A figure in a card: left to right, like every amount. */
export function CardFigure({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" className="tabular-nums">
      {children}
    </span>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <span role="status" className="sr-only">
        {reportText.loading}
      </span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="rounded-card h-32" />
        ))}
      </div>
      <Skeleton className="rounded-card h-72" />
    </div>
  );
}

export interface ReportQueryState {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isPlaceholderData: boolean;
  refetch: () => unknown;
}

export interface ReportFrameProps {
  slug: ReportSlug;
  query: ReportQueryState;
  /** The model of the data on screen, for print / Excel / PDF. */
  sheet: ReportSheet | null;
  shopName: string | null;
  maundKg: string;
  filters: ReactNode;
  /** The report itself, once loaded. */
  children: ReactNode;
}

/**
 * A report page: title and Print / Excel / PDF, the filters, then the
 * report with its loading, error and 403 states. While another range loads
 * the previous report stays, dimmed.
 */
export function ReportFrame({
  slug,
  query,
  sheet,
  shopName,
  maundKg,
  filters,
  children,
}: ReportFrameProps) {
  const r = reportText.reports[slug];
  const error = query.isError ? toApiError(query.error) : null;
  if (error?.status === 403) return <ForbiddenState />;
  // A bad range (e.g. over a year) comes back as a 400 with the reason.
  const reason =
    error?.status === 400
      ? (error.errors[0]?.message ?? error.message ?? null)
      : null;

  return (
    <div className="flex flex-col gap-6" data-report={slug}>
      <PageHeader
        title={r.title}
        description={r.description}
        actions={
          <ReportActions
            sheet={query.isError ? null : sheet}
            shopName={shopName}
            maundKg={maundKg}
          />
        }
      />
      <div className="flex flex-wrap items-end gap-3">{filters}</div>
      {query.isPending ? (
        <ReportSkeleton />
      ) : error ? (
        <EmptyState
          role="alert"
          icon={CircleAlert}
          title={reportText.error.title}
          body={reason ?? reportText.error.body}
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              {reportText.retry}
            </Button>
          }
        />
      ) : (
        <div
          className={cn(
            "flex flex-col gap-6 transition-opacity",
            query.isPlaceholderData && "opacity-60",
          )}
          aria-busy={query.isPlaceholderData || undefined}
        >
          {children}
        </div>
      )}
    </div>
  );
}
