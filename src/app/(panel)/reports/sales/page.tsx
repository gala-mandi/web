import type { Metadata } from "next";
import { pageTitle } from "@/features/panel/text";
import { BookReportPage } from "@/features/reports/components/book-report";
import { reportText } from "@/features/reports/text";

export const metadata: Metadata = {
  title: pageTitle(reportText.documentTitle(reportText.reports["sales"].title)),
};

export default function Page() {
  return <BookReportPage kind="sales" />;
}
