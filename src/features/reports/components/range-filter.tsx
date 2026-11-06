"use client";

import { useId } from "react";
import { DataTableDateRangeFilter } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { rangePresets } from "../range";
import type { ReportRangeState } from "../search-params";
import { reportText } from "../text";

const t = reportText.range;

/**
 * Today / This week / This month (Asia/Karachi days, ending today) and a
 * custom from–to; the chosen range is kept in the URL.
 */
export function ReportRangeFilter({ state }: { state: ReportRangeState }) {
  const labelId = useId();
  const custom = state.preset === "custom";
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <span id={labelId} className="text-[13px] font-semibold">
          {t.presetsLabel}
        </span>
        <div
          role="group"
          aria-labelledby={labelId}
          className="bg-surface-muted inline-flex h-10 items-center gap-1 rounded-field border p-1"
        >
          {rangePresets.map((preset) => {
            const active = state.preset === preset;
            return (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant={active ? "default" : "ghost"}
                aria-pressed={active}
                className={cn("h-8 px-3", !active && "text-muted-foreground")}
                onClick={() => state.setPreset(preset)}
              >
                {t.presets[preset]}
              </Button>
            );
          })}
        </div>
      </div>
      <DataTableDateRangeFilter
        label={t.presets.custom}
        value={state.range}
        onChange={state.setRange}
        className={cn(
          "sm:w-64",
          custom &&
            "[&_button]:border-primary [&_button]:ring-primary/15 [&_button]:ring-3",
        )}
      />
    </div>
  );
}
