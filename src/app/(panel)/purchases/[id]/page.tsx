import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { PurchaseDetailPage } from "@/features/purchases/components/purchase-view";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.purchase),
};

export default async function Page({ params }: PageProps<"/purchases/[id]">) {
  const { id } = await params;
  return <PurchaseDetailPage id={id} />;
}
