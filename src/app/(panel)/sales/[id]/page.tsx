import { pageMetadata } from "@/i18n/metadata";
import { SaleDetailPage } from "@/features/sales/components/sale-view";

export const generateMetadata = pageMetadata("panel.crumbs.sale");

export default async function Page({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  return <SaleDetailPage id={id} />;
}
