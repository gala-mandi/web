import type { Metadata } from "next";
import { KhataPage } from "@/features/ledger/components/khata-page";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.ledger.label),
};

export default function Page() {
  return <KhataPage />;
}
