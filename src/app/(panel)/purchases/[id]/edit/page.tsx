import { pageMetadata } from "@/i18n/metadata";
import { EditPurchasePage } from "@/features/purchases/components/purchase-pages";

export const generateMetadata = pageMetadata("panel.crumbs.editPurchase");

export default async function Page({
  params,
}: PageProps<"/purchases/[id]/edit">) {
  const { id } = await params;
  return <EditPurchasePage id={id} />;
}
