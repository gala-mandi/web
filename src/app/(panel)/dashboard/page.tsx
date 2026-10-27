import type { Metadata } from "next";
import { DashboardHome } from "@/features/panel/components/dashboard-home";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.dashboard.label),
};

export default function DashboardPage() {
  return <DashboardHome />;
}
