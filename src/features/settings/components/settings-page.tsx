"use client";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/features/panel/components/page-skeleton";
import { RequirePermission } from "@/features/panel/components/require-permission";
import {
  ErrorState,
  ForbiddenState,
} from "@/features/panel/components/status-pages";
import { panelText } from "@/features/panel/text";
import { toApiError } from "@/lib/api-error";
import { useSettings } from "../hooks";
import { SettingsForm } from "./settings-form";

/** Settings: the shop's profile, parchi, charges, units and numbering (owners only). */
export function SettingsPage() {
  return (
    <RequirePermission permission="settings.manage">
      <SettingsContent />
    </RequirePermission>
  );
}

function SettingsContent() {
  const section = panelText.sections.settings;
  const query = useSettings();

  if (query.isPending) return <PageSkeleton />;
  if (query.isError) {
    // The role changed since sign-in: the server has the last word.
    if (toApiError(query.error).status === 403) return <ForbiddenState />;
    return <ErrorState retry={() => void query.refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={section.label} description={section.description} />
      <SettingsForm settings={query.data} />
    </div>
  );
}
