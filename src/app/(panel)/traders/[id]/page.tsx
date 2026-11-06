import { pageMetadata } from "@/i18n/metadata";
import { TraderProfile } from "@/features/traders/components/trader-profile";

export const generateMetadata = pageMetadata("panel.crumbs.traderProfile");

export default async function Page({ params }: PageProps<"/traders/[id]">) {
  const { id } = await params;
  return <TraderProfile id={id} />;
}
