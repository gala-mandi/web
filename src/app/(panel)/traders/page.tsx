import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { TradersPage } from "@/features/traders/components/traders-page";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.traders.label),
};

export default function Page() {
  return <TradersPage />;
}
