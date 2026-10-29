"use client";

import { CalendarDays } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { dataTableText as t } from "./text";

/** Radix Select can't have an empty value, so "All" uses this one. */
const ALL = "__all__";

export interface DataTableFilterOption<TValue extends string = string> {
  value: TValue;
  label: string;
  /** Status filter only: classes of the coloured dot, e.g. `bg-success`. */
  dotClassName?: string;
}

export interface DataTableSelectFilterProps<TValue extends string> {
  label: string;
  value: TValue | null;
  options: readonly DataTableFilterOption<TValue>[];
  /** `null` = "All" chosen. */
  onChange: (value: TValue | null) => void;
  /** Text of the "All" option (default "All"). */
  allLabel?: string;
  className?: string;
}

function FilterField({
  labelId,
  triggerId,
  label,
  className,
  children,
}: {
  labelId: string;
  triggerId: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 sm:w-52", className)}>
      <label
        id={labelId}
        htmlFor={triggerId}
        className="text-[13px] font-semibold"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/** One-of-many filter (shadcn Select) with an "All" option. */
export function DataTableSelectFilter<TValue extends string>({
  label,
  value,
  options,
  onChange,
  allLabel = t.toolbar.all,
  className,
}: DataTableSelectFilterProps<TValue>) {
  const labelId = useId();
  const triggerId = useId();

  return (
    <FilterField
      labelId={labelId}
      triggerId={triggerId}
      label={label}
      className={className}
    >
      <Select
        value={value ?? ALL}
        onValueChange={(next) =>
          onChange(next === ALL ? null : (next as TValue))
        }
      >
        <SelectTrigger
          id={triggerId}
          aria-labelledby={labelId}
          className="rounded-field bg-card data-[size=default]:h-10 w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.dotClassName ? (
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", option.dotClassName)}
                />
              ) : null}
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  );
}

/**
 * Status filter: a select whose options carry a coloured dot. The word is
 * always shown, so colour isn't the only cue.
 */
export function DataTableStatusFilter<TValue extends string>(
  props: DataTableSelectFilterProps<TValue>,
) {
  return <DataTableSelectFilter {...props} />;
}

export interface DateRangeValue {
  /** `YYYY-MM-DD` or `null`. */
  from: string | null;
  to: string | null;
}

export interface DataTableDateRangeFilterProps {
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

function DateRangeForm({
  value,
  onApply,
}: {
  value: DateRangeValue;
  onApply: (value: DateRangeValue) => void;
}) {
  const fromId = useId();
  const toId = useId();
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");
  const invalid = Boolean(from && to && from > to);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid) onApply({ from: from || null, to: to || null });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fromId} className="text-[13px] font-semibold">
            {t.dateRange.from}
          </label>
          <Input
            id={fromId}
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            aria-invalid={invalid || undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={toId} className="text-[13px] font-semibold">
            {t.dateRange.to}
          </label>
          <Input
            id={toId}
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            aria-invalid={invalid || undefined}
          />
        </div>
      </div>
      {invalid ? (
        <p role="alert" className="text-destructive text-xs">
          {t.dateRange.invalid}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onApply({ from: null, to: null })}
        >
          {t.dateRange.clear}
        </Button>
        <Button type="submit" disabled={invalid}>
          {t.dateRange.apply}
        </Button>
      </div>
    </form>
  );
}

/**
 * From/to filter with two native date inputs in a popover; the values are
 * calendar days (`YYYY-MM-DD`), e.g. kept in the URL with `parseAsDay`.
 */
export function DataTableDateRangeFilter({
  label,
  value,
  onChange,
  className,
}: DataTableDateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const triggerId = useId();
  const summary =
    value.from || value.to
      ? t.dateRange.summary(
          value.from ? formatDate(value.from) : null,
          value.to ? formatDate(value.to) : null,
        )
      : t.dateRange.any;

  return (
    <FilterField
      labelId={labelId}
      triggerId={triggerId}
      label={label}
      className={className}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            variant="outline"
            aria-labelledby={`${labelId} ${triggerId}`}
            className="rounded-field bg-card h-10 w-full justify-start gap-2 px-3 font-normal"
          >
            <CalendarDays aria-hidden className="text-muted-foreground" />
            <span className="truncate">{summary}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          {open ? (
            <DateRangeForm
              value={value}
              onApply={(next) => {
                onChange(next);
                setOpen(false);
              }}
            />
          ) : null}
        </PopoverContent>
      </Popover>
    </FilterField>
  );
}
