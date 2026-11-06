"use client";

import { Wheat } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { panelText } from "@/features/panel/text";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toApiError } from "@/lib/api-error";
import { useCanWrite } from "@/features/subscription/hooks";
import { formatDate } from "@/lib/format";
import { panelRoutes } from "@/lib/routes";
import { useEveryCommodity, usePastDayRates, useTodayRates } from "../hooks";
import { gridCommodities } from "../schemas";
import { rateText } from "../text";
import { isCalendarDate } from "../values";
import { RateTrendChart } from "./rate-trend-chart";
import { RatesGrid } from "./rates-grid";

const t = rateText;

/** `/rates`: everyone with `rate.view`; entry needs `rate.manage`. */
export function RatesPage() {
  return (
    <RequirePermission permission="rate.view">
      <DailyRates />
    </RequirePermission>
  );
}

/**
 * Today's rates by default. The owner and managers (`rate.manage`, the only
 * roles the server lets change a past day) can open a past day with the date
 * picker; it lives in the URL (`?date=`), so reload keeps it.
 */
function DailyRates() {
  const section = panelText.sections.rates;
  const canManage = useCanWrite("rate.manage");
  const canAddCommodities = useCanWrite("commodity.manage");
  const [dirty, setDirty] = useState(false);
  const [dateParam, setDateParam] = useQueryState("date", parseAsString);

  useUnsavedChangesWarning(dirty, t.grid.leaveWarning);

  const today = useTodayRates();
  const todayDate = today.data?.date;
  // Only a real past day, and only for those who may pick one.
  const pastDate =
    canManage &&
    todayDate &&
    dateParam &&
    isCalendarDate(dateParam) &&
    dateParam < todayDate
      ? dateParam
      : null;
  const past = usePastDayRates(pastDate);
  const commodities = useEveryCommodity();

  const day = pastDate ? past : today;
  const date = pastDate ?? todayDate;

  const pickDate = (next: string) => {
    if (dirty && !window.confirm(t.grid.leaveWarning)) return;
    void setDateParam(next && todayDate && next < todayDate ? next : null);
  };

  const queries = [today, past, commodities];
  const forbidden = queries.some(
    (q) => q.isError && toApiError(q.error).status === 403,
  );
  if (forbidden) return <ForbiddenState />;

  const datePicker =
    canManage && todayDate ? (
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rates-date">{t.date.label}</Label>
          <Input
            id="rates-date"
            type="date"
            dir="ltr"
            max={todayDate}
            value={date ?? ""}
            onChange={(event) => pickDate(event.target.value)}
            className="rounded-field bg-card h-10 w-44"
          />
        </div>
        {pastDate ? (
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => pickDate("")}
          >
            {t.date.backToToday}
          </Button>
        ) : null}
      </div>
    ) : null;

  const failed = queries.find((q) => q.isError);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={section.label}
        description={
          date
            ? pastDate
              ? t.date.showing(formatDate(date))
              : t.date.today(formatDate(date))
            : section.description
        }
        actions={datePicker}
      />

      {pastDate ? (
        <p role="note" className="text-sm font-semibold">
          {t.date.pastHint}
        </p>
      ) : null}

      {failed ? (
        <div
          role="alert"
          className="bg-card rounded-card flex flex-col items-center gap-3 border px-6 py-12 text-center"
        >
          <p className="font-heading font-bold">{t.grid.loadError}</p>
          <Button
            variant="outline"
            onClick={() =>
              queries.forEach((q) => q.isError && void q.refetch())
            }
          >
            {t.grid.retry}
          </Button>
        </div>
      ) : !day.data || !commodities.data || !date ? (
        <div className="flex flex-col gap-2" aria-busy>
          <span className="sr-only" role="status">
            {panelText.loading}
          </span>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DayGrid
          key={date}
          date={date}
          todayDate={todayDate as string}
          commodities={commodities.data}
          day={day.data}
          canManage={canManage}
          canAddCommodities={canAddCommodities}
          onDirtyChange={setDirty}
        />
      )}
    </div>
  );
}

function DayGrid({
  date,
  todayDate,
  commodities,
  day,
  canManage,
  canAddCommodities,
  onDirtyChange,
}: {
  date: string;
  todayDate: string;
  commodities: NonNullable<ReturnType<typeof useEveryCommodity>["data"]>;
  day: NonNullable<ReturnType<typeof useTodayRates>["data"]>;
  canManage: boolean;
  canAddCommodities: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const rows = gridCommodities(commodities, day.data);
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Wheat}
        title={t.grid.empty.title}
        body={t.grid.empty.body}
        action={
          canAddCommodities ? (
            <Button asChild variant="outline">
              <Link href={panelRoutes.commodities}>{t.grid.empty.action}</Link>
            </Button>
          ) : null
        }
      />
    );
  }
  return (
    <>
      <RatesGrid
        date={date}
        commodities={rows}
        rates={day.data}
        yesterday={day.yesterday}
        canManage={canManage}
        onDirtyChange={onDirtyChange}
      />
      <RateTrendChart
        commodities={rows.filter((c) => c.isActive)}
        today={todayDate}
      />
    </>
  );
}
