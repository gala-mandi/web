import type { Metadata } from "next";
import { pageTitle } from "@/features/panel/text";
import { OutstandingReportPage } from "@/features/reports/components/outstanding-report";
import { reportText } from "@/features/reports/text";

export const metadata: Metadata = {
  title: pageTitle(
    reportText.documentTitle(reportText.reports["outstanding"].title),
  ),
};

export default function Page() {
  return <OutstandingReportPage />;
}
