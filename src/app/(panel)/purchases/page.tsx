import { pageMetadata } from "@/i18n/metadata";
import { PurchasesPage } from "@/features/purchases/components/purchases-page";

export const generateMetadata = pageMetadata("panel.sections.purchases.label");

export default function Page() {
  return <PurchasesPage />;
}
