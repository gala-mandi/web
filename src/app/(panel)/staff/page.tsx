import { pageMetadata } from "@/i18n/metadata";
import { StaffPage } from "@/features/staff/components/staff-page";

export const generateMetadata = pageMetadata("panel.sections.staff.label");

export default function Page() {
  return <StaffPage />;
}
