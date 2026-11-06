import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { PaymentDetailPage } from "@/features/payments/components/payment-view";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.voucher),
};

export default async function Page({ params }: PageProps<"/payments/[id]">) {
  const { id } = await params;
  return <PaymentDetailPage id={id} />;
}
