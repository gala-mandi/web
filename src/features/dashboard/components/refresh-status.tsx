"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardText } from "../text";
import { clockTime } from "./chart-parts";

/** "Updated 3:05 pm · Refreshes every 3 minutes", spinning while it fetches. */
export function RefreshStatus({
  updatedAt,
  fetching,
}: {
  /** `dataUpdatedAt` of the main query; 0 before the first answer. */
  updatedAt: number;
  fetching: boolean;
}) {
  if (!updatedAt) return null;
  return (
    <p
      data-testid="refresh-status"
      className="text-muted-foreground flex items-center gap-1.5 text-xs"
      title={dashboardText.autoRefresh}
    >
      <RefreshCw
        aria-hidden
        className={cn(
          "size-3.5",
          fetching && "animate-spin motion-reduce:animate-none",
        )}
      />
      <span>
        {fetching
          ? dashboardText.refreshing
          : dashboardText.updated(clockTime(updatedAt))}
      </span>
      <span aria-hidden>·</span>
      <span>{dashboardText.autoRefresh}</span>
    </p>
  );
}
