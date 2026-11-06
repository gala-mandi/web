import type { Metadata } from "next";
import { CashBookPage } from "@/features/payments/components/cash-book-page";
import { pageTitle } from "@/features/panel/text";
import { paymentText } from "@/features/payments/text";

export const metadata: Metadata = {
  title: pageTitle(paymentText.cashBook.title),
};

/** The Payments section opens on the cash book (today by default). */
export default function Page() {
  return <CashBookPage />;
}
