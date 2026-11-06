import { pageMetadata } from "@/i18n/metadata";
import { SettingsPage } from "@/features/settings/components/settings-page";

export const generateMetadata = pageMetadata("panel.sections.settings.label");

export default function Page() {
  return <SettingsPage />;
}
