import { Dashboard } from "@/features/dashboard/components/dashboard";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("panel.sections.dashboard.label");

export default function DashboardPage() {
  return <Dashboard />;
}
