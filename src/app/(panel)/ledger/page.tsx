import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.ledger.label),
};

/** Placeholder until the Ledger ticket builds this screen. */
export default function LedgerPage() {
  return <SectionPlaceholder section="ledger" />;
}
