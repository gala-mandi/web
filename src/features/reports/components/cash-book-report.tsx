"use client";

import { HandCoins } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/features/panel/components/require-permission";
import {
  CashBookDaysTable,
  CashBookTotals,
} from "@/features/payments/components/cash-book-summary";
import { useCan } from "@/lib/can";
import { paymentRoutes } from "@/lib/routes";
import { useCashBookReport } from "../hooks";
import { useReportRange } from "../search-params";
import { cashBookSheet } from "../sheet";
import { reportText } from "../text";
import { ReportRangeFilter } from "./range-filter";
import { ReportFrame, useReportShop } from "./report-frame";

/** `/reports/cash-book`, for `report.view`. */
export function CashBookReportPage() {
  return (
    <RequirePermission permission="report.view">
      <CashBookReportView />
    </RequirePermission>
  );
}

/**
 * The cash book as a report (`GET /reports/cash-book`): the Payments cash
 * book's own cards and table of days, with date presets, print, Excel and
 * PDF. The cash vouchers behind it stay on the Payments page.
 */
function CashBookReportView() {
  const range = useReportRange();
  const { shopName, maundKg } = useReportShop();
  const canSeeVouchers = useCan("payment.view");
  const book = useCashBookReport(range.range);
  const sheet = useMemo(
    () => (book.data ? cashBookSheet(book.data) : null),
    [book.data],
  );

  return (
    <ReportFrame
      slug="cash-book"
      query={book}
      sheet={sheet}
      shopName={shopName}
      maundKg={maundKg}
      filters={
        <>
          <ReportRangeFilter state={range} />
          {canSeeVouchers ? (
            <Button
              asChild
              variant="ghost"
              className="h-10 gap-2 font-semibold"
            >
              <Link
                href={paymentRoutes.cashBookRange(
                  range.range.from,
                  range.range.to,
                )}
              >
                <HandCoins aria-hidden />
                {reportText.cashBook.vouchers}
              </Link>
            </Button>
          ) : null}
        </>
      }
    >
      {book.data ? (
        <>
          <CashBookTotals book={book.data} />
          <CashBookDaysTable book={book.data} />
        </>
      ) : null}
    </ReportFrame>
  );
}
