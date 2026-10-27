import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.rates.label),
};

/** Placeholder until the Rates ticket builds this screen. */
export default function RatesPage() {
  return <SectionPlaceholder section="rates" />;
}
