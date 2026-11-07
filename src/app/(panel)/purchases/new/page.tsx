import { pageMetadata } from "@/i18n/metadata";
import { NewPurchasePage } from "@/features/purchases/components/purchase-pages";

export const generateMetadata = pageMetadata("panel.crumbs.newPurchase");

export default function Page() {
  return <NewPurchasePage />;
}
