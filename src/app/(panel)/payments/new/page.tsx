import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { NewPaymentPage } from "@/features/payments/components/new-payment-page";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.newVoucher),
};

export default function Page() {
  return <NewPaymentPage />;
}
