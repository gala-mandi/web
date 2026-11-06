import type { Metadata } from "next";
import { pageTitle } from "@/features/panel/text";
import { DailySummaryReportPage } from "@/features/reports/components/daily-summary-report";
import { reportText } from "@/features/reports/text";

export const metadata: Metadata = {
  title: pageTitle(
    reportText.documentTitle(reportText.reports["daily-summary"].title),
  ),
};

export default function Page() {
  return <DailySummaryReportPage />;
}
