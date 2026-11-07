import { pageMetadata } from "@/i18n/metadata";
import { PurchaseDetailPage } from "@/features/purchases/components/purchase-view";

export const generateMetadata = pageMetadata("panel.crumbs.purchase");

export default async function Page({ params }: PageProps<"/purchases/[id]">) {
  const { id } = await params;
  return <PurchaseDetailPage id={id} />;
}
