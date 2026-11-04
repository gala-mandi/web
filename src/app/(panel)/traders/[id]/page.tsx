import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { TraderProfile } from "@/features/traders/components/trader-profile";

export const metadata: Metadata = {
  title: pageTitle(panelText.crumbs.traderProfile),
};

export default async function Page({ params }: PageProps<"/traders/[id]">) {
  const { id } = await params;
  return <TraderProfile id={id} />;
}
