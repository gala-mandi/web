import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { NewSalePage } from "@/features/sales/components/sale-pages";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.newSale),
};

export default function Page() {
  return <NewSalePage />;
}
