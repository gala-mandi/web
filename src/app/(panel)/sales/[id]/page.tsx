import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { SaleDetailPage } from "@/features/sales/components/sale-view";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.sale),
};

export default async function Page({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  return <SaleDetailPage id={id} />;
}
