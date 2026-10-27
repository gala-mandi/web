import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.traders.label),
};

/** Placeholder until the Traders ticket builds this screen. */
export default function TradersPage() {
  return <SectionPlaceholder section="traders" />;
}
