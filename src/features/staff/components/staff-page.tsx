"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { PlanUsage } from "@/features/subscription/components/plan-usage";
import { staffText } from "../text";
import { InvitationsTable } from "./invitations-table";
import { InviteDialog } from "./invite-dialog";
import { StaffTable } from "./staff-table";

const t = staffText.tabs;

/** Staff: the shop's users and their invitations (owners only). */
export function StaffPage() {
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
          <TabsList aria-label={t.label}>
            <TabsTrigger value="staff">{t.staff}</TabsTrigger>
            <TabsTrigger value="invitations">{t.invitations}</TabsTrigger>
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
