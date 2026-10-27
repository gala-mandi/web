import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.settings.label),
};

/** Placeholder until the Settings ticket builds this screen. */
export default function SettingsPage() {
  return <SectionPlaceholder section="settings" />;
}
