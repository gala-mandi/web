import { reportMetadata } from "@/i18n/metadata";
import { DailySummaryReportPage } from "@/features/reports/components/daily-summary-report";

export const generateMetadata = reportMetadata("daily-summary");

export default function Page() {
  return <DailySummaryReportPage />;
}
