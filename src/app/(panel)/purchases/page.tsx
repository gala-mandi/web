import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { PurchasesPage } from "@/features/purchases/components/purchases-page";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.purchases.label),
};

export default function Page() {
  return <PurchasesPage />;
}
