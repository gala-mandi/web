import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { EditPurchasePage } from "@/features/purchases/components/purchase-pages";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.editPurchase),
};

export default async function Page({
  params,
}: PageProps<"/purchases/[id]/edit">) {
  const { id } = await params;
  return <EditPurchasePage id={id} />;
}
