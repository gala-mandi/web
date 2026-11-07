"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { PlanUsage } from "@/features/subscription/components/plan-usage";
import { InvitationsTable } from "./invitations-table";
import { InviteDialog } from "./invite-dialog";
import { StaffTable } from "./staff-table";

/** Staff: the shop's users and their invitations (owners only). */
export function StaffPage() {
  const t = useTranslations("staff");
  const section = useTranslations("panel.sections.staff");
  return (
    <RequirePermission permission="staff.manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={section("label")}
          description={section("description")}
          actions={<InviteDialog />}
        />
        <PlanUsage />
        <Tabs defaultValue="staff" className="gap-4">
          <TabsList aria-label={t("tabs.label")}>
            <TabsTrigger value="staff">{t("tabs.staff")}</TabsTrigger>
            <TabsTrigger value="invitations">
              {t("tabs.invitations")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="staff">
            <StaffTable />
          </TabsContent>
          <TabsContent value="invitations">
            <InvitationsTable />
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}
