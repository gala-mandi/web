import { reportMetadata } from "@/i18n/metadata";
import { CashBookReportPage } from "@/features/reports/components/cash-book-report";

export const generateMetadata = reportMetadata("cash-book");

export default function Page() {
  return <CashBookReportPage />;
}
