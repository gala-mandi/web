import { pageMetadata } from "@/i18n/metadata";
import { ReportsHub } from "@/features/reports/components/reports-hub";

export const generateMetadata = pageMetadata("panel.sections.reports.label");

export default function ReportsPage() {
  return <ReportsHub />;
}
