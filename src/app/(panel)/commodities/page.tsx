import type { Metadata } from "next";
import { CommoditiesPage } from "@/features/commodities/components/commodities-page";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.commodities.label),
};

export default function Page() {
  return <CommoditiesPage />;
}
