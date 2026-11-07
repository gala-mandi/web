import { pageMetadata } from "@/i18n/metadata";
import { NewSalePage } from "@/features/sales/components/sale-pages";

export const generateMetadata = pageMetadata("panel.crumbs.newSale");

export default function Page() {
  return <NewSalePage />;
}
