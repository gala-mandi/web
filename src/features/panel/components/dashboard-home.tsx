"use client";

import { Button } from "@/components/ui/button";
import { useMe } from "@/features/auth/hooks";
import { panelText } from "../text";

const t = panelText.dashboard;

/** Placeholder until the dashboard ticket. */
export function DashboardHome() {
  const me = useMe();

  return (
    <section className="bg-card rounded-card shadow-card flex max-w-2xl flex-col gap-2 p-6">
      <h1 className="font-heading text-2xl font-extrabold tracking-tight">
        {t.title}
      </h1>
      {me.isPending ? (
        <p role="status" className="text-muted-foreground">
          {t.loading}
        </p>
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
  );
}
