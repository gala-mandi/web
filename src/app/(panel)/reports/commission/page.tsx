import { reportMetadata } from "@/i18n/metadata";
import { CommissionReportPage } from "@/features/reports/components/commission-report";

export const generateMetadata = reportMetadata("commission");

export default function Page() {
  return <CommissionReportPage />;
}
