import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { ReportsHub } from "@/features/reports/components/reports-hub";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.reports.label),
};

export default function ReportsPage() {
  return <ReportsHub />;
}
