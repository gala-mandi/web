import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.reports.label),
};

/** Placeholder until the Reports ticket builds this screen. */
export default function ReportsPage() {
  return <SectionPlaceholder section="reports" />;
}
