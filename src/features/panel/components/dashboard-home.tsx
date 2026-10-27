"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/auth/hooks";
import { sectionPermission } from "@/lib/routes";
import { panelText } from "../text";
import { RequirePermission } from "./require-permission";

const t = panelText.dashboard;
const section = panelText.sections.dashboard;

/** Placeholder until the dashboard ticket. */
export function DashboardHome() {
  const me = useMe();

  return (
    <RequirePermission permission={sectionPermission.dashboard}>
      <div className="flex flex-col gap-6">
        <PageHeader title={section.label} description={section.description} />
        <section className="bg-card rounded-card flex flex-col gap-2 border p-6">
          {me.isPending ? (
            <div role="status" className="flex flex-col gap-2">
              <span className="sr-only">{t.loading}</span>
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          ) : me.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-destructive">{t.error}</p>
              <Button variant="outline" onClick={() => me.refetch()}>
                {t.retry}
              </Button>
            </div>
          ) : (
            <>
              <p className="text-lg font-semibold">{t.welcome(me.data.name)}</p>
              <p className="text-muted-foreground">{t.body}</p>
            </>
          )}
        </section>
      </div>
    </RequirePermission>
  );
}
