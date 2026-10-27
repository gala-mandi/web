import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.sales.label),
};

/** Placeholder until the Sales ticket builds this screen. */
export default function SalesPage() {
  return <SectionPlaceholder section="sales" />;
}
