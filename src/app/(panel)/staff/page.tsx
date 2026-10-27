import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.staff.label),
};

/** Placeholder until the Staff ticket builds this screen. */
export default function StaffPage() {
  return <SectionPlaceholder section="staff" />;
}
