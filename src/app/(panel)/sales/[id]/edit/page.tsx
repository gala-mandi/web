import { pageMetadata } from "@/i18n/metadata";
import { EditSalePage } from "@/features/sales/components/sale-pages";

export const generateMetadata = pageMetadata("panel.crumbs.editSale");

export default async function Page({ params }: PageProps<"/sales/[id]/edit">) {
  const { id } = await params;
  return <EditSalePage id={id} />;
}
