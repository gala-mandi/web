import type { Metadata } from "next";
import { DashboardHome } from "@/features/panel/components/dashboard-home";

export const metadata: Metadata = { title: "Dashboard — Galla Mandi" };

export default function DashboardPage() {
  return <DashboardHome />;
}
