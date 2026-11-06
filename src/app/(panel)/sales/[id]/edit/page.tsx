import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { EditSalePage } from "@/features/sales/components/sale-pages";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.editSale),
};

export default async function Page({ params }: PageProps<"/sales/[id]/edit">) {
  const { id } = await params;
  return <EditSalePage id={id} />;
}
