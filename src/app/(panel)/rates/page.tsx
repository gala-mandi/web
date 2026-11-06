import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { RatesPage } from "@/features/rates/components/rates-page";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.rates.label),
};

export default function Page() {
  return <RatesPage />;
}
