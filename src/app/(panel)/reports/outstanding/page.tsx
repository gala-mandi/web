import { reportMetadata } from "@/i18n/metadata";
import { OutstandingReportPage } from "@/features/reports/components/outstanding-report";

export const generateMetadata = reportMetadata("outstanding");

export default function Page() {
  return <OutstandingReportPage />;
}
