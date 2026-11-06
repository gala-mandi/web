import type { Metadata } from "next";
import { pageTitle } from "@/features/panel/text";
import { CashBookReportPage } from "@/features/reports/components/cash-book-report";
import { reportText } from "@/features/reports/text";

export const metadata: Metadata = {
  title: pageTitle(
    reportText.documentTitle(reportText.reports["cash-book"].title),
  ),
};

export default function Page() {
  return <CashBookReportPage />;
}
