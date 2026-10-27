import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.commodities.label),
};

/** Placeholder until the Commodities ticket builds this screen. */
export default function CommoditiesPage() {
  return <SectionPlaceholder section="commodities" />;
}
