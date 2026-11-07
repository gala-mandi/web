"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useSubscription } from "../hooks";

/** "3 of 5 users on your Basic plan", with a bar; amber when full. */
export function PlanUsage() {
  const t = useTranslations("subscription.limit");
  const sub = useSubscription().data?.subscription;
  if (!sub) return null;
  const { usersUsed: used, plan } = sub;
  const full = used >= plan.maxUsers;
  const share = Math.min(100, (used / Math.max(1, plan.maxUsers)) * 100);
  return (
    <div
      data-testid="plan-usage"
      className="bg-card flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
    >
      <span
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          full && "text-notice",
        )}
      >
        <Users aria-hidden className="size-4" />
        {t("usage", { used, max: plan.maxUsers, plan: plan.name })}
      </span>
      <div
        aria-hidden
        className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full sm:max-w-64"
      >
        <div
          className={cn(
            "h-full rounded-full",
            full ? "bg-notice" : "bg-primary",
          )}
          style={{ inlineSize: `${share}%` }}
        />
      </div>
    </div>
  );
}
