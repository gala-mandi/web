import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { StaffPage } from "@/features/staff/components/staff-page";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.staff.label),
};

export default function Page() {
  return <StaffPage />;
}
