import { CashBookPage } from "@/features/payments/components/cash-book-page";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("payments.cashBook.title");

/** The Payments section opens on the cash book (today by default). */
export default function Page() {
  return <CashBookPage />;
}
