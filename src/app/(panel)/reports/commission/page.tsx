import type { Metadata } from "next";
import { pageTitle } from "@/features/panel/text";
import { CommissionReportPage } from "@/features/reports/components/commission-report";
import { reportText } from "@/features/reports/text";

export const metadata: Metadata = {
  title: pageTitle(
    reportText.documentTitle(reportText.reports["commission"].title),
  ),
};

export default function Page() {
  return <CommissionReportPage />;
}
