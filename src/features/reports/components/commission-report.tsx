"use client";

import { useTranslations } from "next-intl";
import { useSheetWords } from "../use-sheet-words";
import { HandCoins, ShoppingBasket, Truck } from "lucide-react";
import { useMemo } from "react";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { useFormat } from "@/lib/use-format";
import { useCommissionReport } from "../hooks";
import { useReportRange } from "../search-params";
import { commissionSheet } from "../sheet";
import { ReportRangeFilter } from "./range-filter";
import {
  CardFigure,
  type ReportCard,
  ReportCards,
  ReportFrame,
  useReportShop,
} from "./report-frame";
import { ReportTableView } from "./report-table";

/** `/reports/commission`, for `report.view`. */
export function CommissionReportPage() {
  return (
    <RequirePermission permission="report.view">
      <CommissionReportView />
    </RequirePermission>
  );
}

function CommissionReportView() {
  const { formatRs } = useFormat();
  const t = useTranslations("reports");
  const range = useReportRange();
  const { shopName, maundKg } = useReportShop();
  const report = useCommissionReport(range.range);
  const words = useSheetWords();
  const sheet = useMemo(
    () => (report.data ? commissionSheet(words, report.data) : null),
    [words, report.data],
  );
  const totals = report.data?.totals;
  const cards: ReportCard[] = totals
    ? [
        {
          id: "commission",
          label: t("cards.commission"),
          icon: HandCoins,
          tone: "primary",
          value: <CardFigure>{formatRs(totals.total)}</CardFigure>,
          hint: t("cards.commissionHint"),
        },
        {
          id: "on-purchases",
          label: t("cards.onPurchases"),
          icon: ShoppingBasket,
          tone: "orange",
          value: <CardFigure>{formatRs(totals.purchases)}</CardFigure>,
        },
        {
          id: "on-sales",
          label: t("cards.onSales"),
          icon: Truck,
          tone: "green",
          value: <CardFigure>{formatRs(totals.sales)}</CardFigure>,
        },
      ]
    : [];

  return (
    <ReportFrame
      slug="commission"
      query={report}
      sheet={sheet}
      shopName={shopName}
      maundKg={maundKg}
      filters={<ReportRangeFilter state={range} />}
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
