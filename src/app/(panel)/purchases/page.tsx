import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.purchases.label),
};

/** Placeholder until the Purchases ticket builds this screen. */
export default function PurchasesPage() {
  return <SectionPlaceholder section="purchases" />;
}
