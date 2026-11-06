import { pageMetadata } from "@/i18n/metadata";
import { SalesPage } from "@/features/sales/components/sales-page";

export const generateMetadata = pageMetadata("panel.sections.sales.label");

export default function Page() {
  return <SalesPage />;
}
