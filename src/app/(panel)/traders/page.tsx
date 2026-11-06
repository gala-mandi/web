import { pageMetadata } from "@/i18n/metadata";
import { TradersPage } from "@/features/traders/components/traders-page";

export const generateMetadata = pageMetadata("panel.sections.traders.label");

export default function Page() {
  return <TradersPage />;
}
