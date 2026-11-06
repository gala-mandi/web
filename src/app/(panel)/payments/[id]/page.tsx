import { pageMetadata } from "@/i18n/metadata";
import { PaymentDetailPage } from "@/features/payments/components/payment-view";

export const generateMetadata = pageMetadata("panel.crumbs.voucher");

export default async function Page({ params }: PageProps<"/payments/[id]">) {
  const { id } = await params;
  return <PaymentDetailPage id={id} />;
}
