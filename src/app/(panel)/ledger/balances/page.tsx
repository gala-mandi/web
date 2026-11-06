import type { Metadata } from "next";
import { BalancesPage } from "@/features/ledger/components/balances-page";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.balances),
};

export default function Page() {
  return <BalancesPage />;
}
