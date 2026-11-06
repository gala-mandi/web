import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { NewPurchasePage } from "@/features/purchases/components/purchase-pages";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.newPurchase),
};

export default function Page() {
  return <NewPurchasePage />;
}
