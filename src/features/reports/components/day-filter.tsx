"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shiftDay } from "../range";
import { reportText } from "../text";

const t = reportText.day;

export interface ReportDayFilterProps {
  label: string;
  /** `YYYY-MM-DD`, or null for "now" (see `resetLabel`). */
  value: string | null;
  today: string;
  onChange: (day: string | null) => void;
  /** The button that goes back to the default (Today, or Now). */
  resetLabel?: string;
  /** The input shows today while `value` is null (off: empty, "now"). */
  nullIsToday?: boolean;
  className?: string;
}

/**
 * One day: a date input, previous / next day and a button back to the
 * default. Days after today can't be picked.
 */
export function ReportDayFilter({
  label,
  value,
  today,
  onChange,
  resetLabel = t.today,
  nullIsToday = true,
  className,
}: ReportDayFilterProps) {
  const id = useId();
  const day = value ?? today;
  const pick = (next: string) => onChange(next > today ? today : next);
  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-[13px] font-semibold">
            {label}
          </label>
          <Input
            id={id}
            type="date"
            value={value ?? (nullIsToday ? today : "")}
            max={today}
            onChange={(event) =>
              event.target.value ? pick(event.target.value) : onChange(null)
            }
            className="h-10 w-44"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10"
          aria-label={t.previous}
          onClick={() => pick(shiftDay(day, -1))}
        >
          <ChevronLeft aria-hidden className="rtl:rotate-180" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10"
          aria-label={t.next}
          disabled={day >= today}
          onClick={() => pick(shiftDay(day, 1))}
        >
          <ChevronRight aria-hidden className="rtl:rotate-180" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 font-semibold"
          disabled={value === null}
          onClick={() => onChange(null)}
        >
          {resetLabel}
        </Button>
      </div>
    </div>
  );
}
