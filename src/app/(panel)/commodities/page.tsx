import { CommoditiesPage } from "@/features/commodities/components/commodities-page";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata(
  "panel.sections.commodities.label",
);

export default function Page() {
  return <CommoditiesPage />;
}
