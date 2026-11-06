import { useTranslations } from "next-intl";
import { Construction } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { type PanelSection, sectionPermission } from "@/lib/routes";
import { RequirePermission } from "./require-permission";

/** Placeholder page for a menu item whose screen comes in a later ticket. */
export function SectionPlaceholder({ section }: { section: PanelSection }) {
  const t = useTranslations("panel");
  return (
    <RequirePermission permission={sectionPermission[section]}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t(`sections.${section}.label`)}
          description={t(`sections.${section}.description`)}
        />
        <EmptyState
          icon={Construction}
          title={t("comingSoon.title")}
          body={t("comingSoon.body")}
        />
      </div>
    </RequirePermission>
  );
}
