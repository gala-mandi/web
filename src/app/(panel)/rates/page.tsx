import { pageMetadata } from "@/i18n/metadata";
import { RatesPage } from "@/features/rates/components/rates-page";

export const generateMetadata = pageMetadata("panel.sections.rates.label");

export default function Page() {
  return <RatesPage />;
}
