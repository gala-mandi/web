"use client";

import { Banknote, Receipt, Scale, Wallet } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { DataTableSelectFilter } from "@/components/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookReportQuery } from "@/features/dashboard/types";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { useEveryCommodity } from "@/features/rates/hooks";
import { TraderCombobox } from "@/features/traders/components/trader-combobox";
import type { TraderLookupItem } from "@/features/traders/types";
import { formatKg, formatMaund, formatRs } from "@/lib/format";
import { useBookReport, useFilterTrader } from "../hooks";
import { reportGroups, useBookFilters, useReportRange } from "../search-params";
import { type BookKind, bookSheet } from "../sheet";
import { reportText } from "../text";
import { ReportRangeFilter } from "./range-filter";
import {
  CardFigure,
  type ReportCard,
  ReportCards,
  ReportFrame,
  useReportShop,
} from "./report-frame";
import { ReportTableView } from "./report-table";

const t = reportText;

/** `/reports/purchases` and `/reports/sales`, for `report.view`. */
export function BookReportPage({ kind }: { kind: BookKind }) {
  return (
    <RequirePermission permission="report.view">
      <BookReportView kind={kind} />
    </RequirePermission>
  );
}

function GroupBySelect({
  value,
  onChange,
}: {
  value: BookReportQuery["groupBy"];
  onChange: (value: BookReportQuery["groupBy"]) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {t.filters.groupBy}
      </label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as BookReportQuery["groupBy"])}
      >
        <SelectTrigger
          id={id}
          className="rounded-field bg-card data-[size=default]:h-10 w-40"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {reportGroups.map((group) => (
            <SelectItem key={group} value={group}>
              {t.filters.groups[group]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** The kissan (purchases) or beopari (sales) filter; null = all. */
function TraderFilter({
  kind,
  id,
  onChange,
}: {
  kind: BookKind;
  id: string | null;
  onChange: (trader: TraderLookupItem | null) => void;
}) {
  const labelId = useId();
  const [picked, setPicked] = useState<TraderLookupItem | null>(null);
  const loaded = useFilterTrader(picked?.id === id ? null : id);
  const value: TraderLookupItem | null = !id
    ? null
    : picked?.id === id
      ? picked
      : loaded.data
        ? loaded.data
        : null;
  const label = kind === "purchases" ? t.filters.kissan : t.filters.beopari;
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-56">
      <span id={labelId} className="text-[13px] font-semibold">
        {label}
      </span>
      <TraderCombobox
        value={value}
        type={kind === "purchases" ? "kissan" : "beopari"}
        allowQuickAdd={false}
        className="h-10"
        placeholder={
          kind === "purchases" ? t.filters.allKissans : t.filters.allBeoparis
        }
        aria-labelledby={labelId}
        onChange={(trader) => {
          setPicked(trader);
          onChange(trader);
        }}
      />
    </div>
  );
}

function BookReportView({ kind }: { kind: BookKind }) {
  const range = useReportRange();
  const [filters, setFilters] = useBookFilters();
  const { shopName, maundKg } = useReportShop();
  const commodities = useEveryCommodity();
  const trader = useFilterTrader(filters.trader);

  const query: BookReportQuery = {
    ...range.range,
    groupBy: filters.groupBy,
    ...(filters.commodity ? { commodity: filters.commodity } : {}),
    ...(filters.trader ? { trader: filters.trader } : {}),
  };
  const report = useBookReport(kind, query);

  const urduNames = useMemo(
    () => new Map((commodities.data ?? []).map((c) => [c.id, c.nameUr])),
    [commodities.data],
  );
  const commodityName =
    commodities.data?.find((c) => c.id === filters.commodity)?.name ?? null;
  const sheet = useMemo(
    () =>
      report.data
        ? bookSheet(kind, report.data, {
            urduNames,
            commodityName,
            traderName: filters.trader ? (trader.data?.name ?? null) : null,
          })
        : null,
    [kind, report.data, urduNames, commodityName, filters.trader, trader.data],
  );

  const totals = report.data?.totals;
  const charges = totals
    ? kind === "purchases"
      ? (totals as { totalDeductions: string | null }).totalDeductions
      : (totals as { totalCharges: string | null }).totalCharges
    : null;
  const cards: ReportCard[] = totals
    ? [
        {
          id: "bills",
          label: t.cards.bills,
          icon: Receipt,
          tone: "violet",
          value: (
            <CardFigure>{totals.bills.toLocaleString("en-PK")}</CardFigure>
          ),
          hint: t.cards.bagsHint(totals.bags),
        },
        {
          id: "weight",
          label: t.cards.weight,
          icon: Scale,
          tone: "orange",
          value: (
            <CardFigure>{formatMaund(totals.weightKg, maundKg)}</CardFigure>
          ),
          hint: <span dir="ltr">{formatKg(totals.weightKg)}</span>,
        },
        {
          id: "gross",
          label: t.cards.gross,
          icon: Banknote,
          tone: "green",
          value: <CardFigure>{formatRs(totals.grossAmount)}</CardFigure>,
          hint:
            charges === null
              ? null
              : `${kind === "purchases" ? t.cards.deductions : t.cards.charges} ${formatRs(charges)}`,
        },
        {
          id: "net",
          label: t.cards.net,
          icon: Wallet,
          tone: "primary",
          value: (
            <CardFigure>
              {totals.netAmount === null ? t.none : formatRs(totals.netAmount)}
            </CardFigure>
          ),
          hint:
            totals.netAmount === null ? t.cards.perBill : t.cards.netHint[kind],
        },
      ]
    : [];

  const commodityOptions = (commodities.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <ReportFrame
      slug={kind}
      query={report}
      sheet={sheet}
      shopName={shopName}
      maundKg={maundKg}
      filters={
        <>
          <ReportRangeFilter state={range} />
          <GroupBySelect
            value={filters.groupBy}
            onChange={(groupBy) =>
              void setFilters({ groupBy: groupBy === "day" ? null : groupBy })
            }
          />
          <DataTableSelectFilter
            label={t.filters.commodity}
            value={filters.commodity}
            options={commodityOptions}
            allLabel={t.filters.allCommodities}
            onChange={(commodity) => void setFilters({ commodity })}
          />
          <TraderFilter
            kind={kind}
            id={filters.trader}
            onChange={(picked) =>
              void setFilters({ trader: picked?.id ?? null })
            }
          />
        </>
      }
    >
      <ReportCards cards={cards} />
      {sheet?.tables.map((table) => (
        <ReportTableView
          key={table.id}
          table={table}
          maundKg={maundKg}
          isFetching={report.isPlaceholderData}
        />
      ))}
    </ReportFrame>
  );
}
