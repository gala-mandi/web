import { KhataPage } from "@/features/ledger/components/khata-page";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("panel.sections.ledger.label");

export default function Page() {
  return <KhataPage />;
}
