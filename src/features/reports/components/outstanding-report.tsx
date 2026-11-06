"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { DataTableSelectFilter } from "@/components/data-table";
import type { OutstandingQuery } from "@/features/dashboard/types";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { traderTypes } from "@/features/traders/types";
import { formatRs } from "@/lib/format";
import { useOutstandingReport } from "../hooks";
import { useOutstandingFilters, useToday } from "../search-params";
import { outstandingSheet } from "../sheet";
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

const typeOptions = traderTypes.map((type) => ({
  value: type,
  label: t.traderTypes[type],
}));

/** `/reports/outstanding`, for `report.view`. */
export function OutstandingReportPage() {
  return (
    <RequirePermission permission="report.view">
      <OutstandingReportView />
    </RequirePermission>
  );
}

/**
 * Every trader with a khata balance, as of now or the end of a day:
 * receivable and payable, largest first, each with the server's total.
 */
function OutstandingReportView() {
  const today = useToday();
  const [filters, setFilters] = useOutstandingFilters();
  const { shopName, maundKg } = useReportShop();
  const query: OutstandingQuery = {
    ...(filters.asOf ? { asOf: filters.asOf } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  };
  const report = useOutstandingReport(query);
  const sheet = useMemo(
    () =>
      report.data
        ? outstandingSheet(
            report.data,
            filters.type ? t.traderTypes[filters.type] : null,
          )
        : null,
    [report.data, filters.type],
  );

  const data = report.data;
  const cards: ReportCard[] = data
    ? [
        {
          id: "receivable",
          label: t.cards.receivable,
          icon: ArrowDownLeft,
          tone: "green",
          value: <CardFigure>{formatRs(data.receivable.total)}</CardFigure>,
          hint: `${t.cards.receivableHint} · ${t.traders(data.receivable.count)}`,
        },
        {
          id: "payable",
          label: t.cards.payable,
          icon: ArrowUpRight,
          tone: "orange",
          value: <CardFigure>{formatRs(data.payable.total)}</CardFigure>,
          hint: `${t.cards.payableHint} · ${t.traders(data.payable.count)}`,
        },
      ]
    : [];

  return (
    <ReportFrame
      slug="outstanding"
      query={report}
      sheet={sheet}
      shopName={shopName}
      maundKg={maundKg}
      filters={
        <>
          <ReportDayFilter
            label={t.asOf.label}
            value={filters.asOf}
            today={today}
            nullIsToday={false}
            resetLabel={t.asOf.now}
            onChange={(asOf) => void setFilters({ asOf })}
          />
          <DataTableSelectFilter
            label={t.filters.traderType}
            value={filters.type}
            options={typeOptions}
            allLabel={t.filters.allTypes}
            onChange={(type) => void setFilters({ type })}
          />
        </>
      }
    >
      <ReportCards cards={cards} />
      <div className="grid gap-6 xl:grid-cols-2">
        {sheet?.tables.map((table) => (
          <ReportTableView
            key={table.id}
            table={table}
            maundKg={maundKg}
            isFetching={report.isPlaceholderData}
          />
        ))}
      </div>
    </ReportFrame>
  );
}
