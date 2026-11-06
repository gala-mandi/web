import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { SalesPage } from "@/features/sales/components/sales-page";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.sales.label),
};

export default function Page() {
  return <SalesPage />;
}
