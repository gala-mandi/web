import { Construction } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { type PanelSection, sectionPermission } from "@/lib/routes";
import { panelText } from "../text";
import { RequirePermission } from "./require-permission";

/** Placeholder page for a menu item whose screen comes in a later ticket. */
export function SectionPlaceholder({ section }: { section: PanelSection }) {
  const t = panelText.sections[section];
  return (
    <RequirePermission permission={sectionPermission[section]}>
      <div className="flex flex-col gap-6">
        <PageHeader title={t.label} description={t.description} />
        <EmptyState
          icon={Construction}
          title={panelText.comingSoon.title}
          body={panelText.comingSoon.body}
        />
      </div>
    </RequirePermission>
  );
}
