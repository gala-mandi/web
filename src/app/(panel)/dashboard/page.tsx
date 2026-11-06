import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/components/dashboard";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.dashboard.label),
};

export default function DashboardPage() {
  return <Dashboard />;
}
