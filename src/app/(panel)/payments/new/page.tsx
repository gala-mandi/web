import { pageMetadata } from "@/i18n/metadata";
import { NewPaymentPage } from "@/features/payments/components/new-payment-page";

export const generateMetadata = pageMetadata("panel.crumbs.newVoucher");

export default function Page() {
  return <NewPaymentPage />;
}
