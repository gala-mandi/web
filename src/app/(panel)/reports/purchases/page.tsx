import { reportMetadata } from "@/i18n/metadata";
import { BookReportPage } from "@/features/reports/components/book-report";

export const generateMetadata = reportMetadata("purchases");

export default function Page() {
  return <BookReportPage kind="purchases" />;
}
