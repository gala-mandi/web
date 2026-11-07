import { BalancesPage } from "@/features/ledger/components/balances-page";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("panel.crumbs.balances");

export default function Page() {
  return <BalancesPage />;
}
