import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { SettingsPage } from "@/features/settings/components/settings-page";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.settings.label),
};

export default function Page() {
  return <SettingsPage />;
}
