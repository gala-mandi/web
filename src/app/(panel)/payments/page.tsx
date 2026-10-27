import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.payments.label),
};

/** Placeholder until the Payments ticket builds this screen. */
export default function PaymentsPage() {
  return <SectionPlaceholder section="payments" />;
}
