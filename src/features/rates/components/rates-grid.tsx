"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { AlertCircle, ClipboardCopy, Loader2 } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Control,
  useController,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommodityName } from "@/features/commodities/components/commodity-name";
import type { Commodity } from "@/features/commodities/types";
import { toApiError } from "@/lib/api-error";
import { formatDate, formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSaveRates } from "../hooks";
import {
  copyRates,
  type RateField,
  rateFields,
  ratesFormSchema,
  type RatesFormValues,
  toFormField,
  toRatesFormValues,
  toSaveInput,
} from "../schemas";
import { perUnitText, rateText } from "../text";
import type { DayRates } from "../types";

const t = rateText.grid;

/** Marks the rate inputs that Enter walks through, in DOM order. */
const CELL_ATTRIBUTE = "data-rate-cell";

interface GridRow {
  index: number;
  commodity: Commodity;
}

const features = tableFeatures({});
const col = createColumnHelper<typeof features, GridRow>();

export interface RatesGridProps {
  /** The day being entered, e.g. "2026-11-06". */
  date: string;
  /** The grid's commodities, in name order. */
  commodities: Commodity[];
  /** The day's saved rates. */
  rates: DayRates["data"];
  /** The day before (for "Copy yesterday"). */
  yesterday: DayRates;
  /** `rate.manage`: inputs and Save; without it the grid is read-only. */
  canManage: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Spreadsheet-like entry of one day's rates: one row per commodity with min,
 * max and avg. Tab or Enter moves to the next cell (Shift goes back), Enter
 * on the last cell moves to Save, so a whole day can be typed without the
 * mouse. Only filled rows are sent; the server's field errors land on their
 * cell.
 */
export function RatesGrid({
  date,
  commodities,
  rates,
  yesterday,
  canManage,
  onDirtyChange,
}: RatesGridProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const save = useSaveRates();

  const form = useForm<RatesFormValues>({
    resolver: zodResolver(ratesFormSchema),
    defaultValues: toRatesFormValues(commodities, rates),
    mode: "onTouched",
  });
  const { fields } = useFieldArray({ control: form.control, name: "rows" });
  const { isDirty } = form.formState;
  const busy = form.formState.isSubmitting || save.isPending;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  // Leaving the page (or another date) with the form mounted counts as clean.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const data = useMemo<GridRow[]>(
    () =>
      fields.flatMap((field, index) => {
        const commodity = commodities.find((c) => c.id === field.commodityId);
        return commodity ? [{ index, commodity }] : [];
      }),
    [fields, commodities],
  );

  const columns = useMemo(
    () => [
      col.display({
        id: "commodity",
        header: t.columns.commodity,
        cell: ({ row }) => (
          <CommodityCell
            control={form.control}
            index={row.original.index}
            commodity={row.original.commodity}
          />
        ),
      }),
      ...rateFields.map((field) =>
        col.display({
          id: field,
          header: () => (
            <>
              {t.columns[field]}
              {field === "avgRate" ? (
                <span className="text-muted-foreground ms-1 font-normal normal-case">
                  ({t.optional})
                </span>
              ) : null}
            </>
          ),
          cell: ({ row }) => (
            <RateCell
              control={form.control}
              index={row.original.index}
              field={field}
              name={row.original.commodity.name}
              readOnly={!canManage}
            />
          ),
        }),
      ),
    ],
    [form.control, canManage],
  );

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.commodity.id,
  });

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    if (!target.hasAttribute(CELL_ATTRIBUTE)) return;
    // Enter in a cell never submits the form; it moves on like Tab.
    event.preventDefault();
    const cells = Array.from(
      gridRef.current?.querySelectorAll<HTMLInputElement>(
        `input[${CELL_ATTRIBUTE}]`,
      ) ?? [],
    );
    const next =
      cells.indexOf(target as HTMLInputElement) + (event.shiftKey ? -1 : 1);
    if (next >= cells.length) saveRef.current?.focus();
    else cells[Math.max(0, next)]?.focus();
  };

  const copyYesterday = () => {
    const copied = copyRates(form.getValues("rows"), yesterday.data);
    if (copied.length === 0) {
      toast.info(t.nothingToCopy);
      return;
    }
    for (const { index, row } of copied) {
      for (const field of [...rateFields, "rateUnit"] as const) {
        form.setValue(`rows.${index}.${field}`, row[field], {
          shouldDirty: true,
        });
      }
    }
    toast.success(t.copied(copied.length));
  };

  const submit = async (values: RatesFormValues) => {
    setFormError(null);
    const { input, rowIndexes } = toSaveInput(values);
    if (input.rates.length === 0) {
      toast.info(t.nothingChanged);
      return;
    }
    try {
      const saved = await save.mutateAsync({ date, input });
      form.reset(toRatesFormValues(commodities, saved.data));
      toast.success(t.saved);
    } catch (error) {
      const e = toApiError(error);
      let applied = 0;
      for (const { field, message } of e.errors) {
        const name = toFormField(field, rowIndexes);
        if (!name) continue;
        form.setError(
          name,
          { type: "server", message: message || rateText.errors.generic },
          { shouldFocus: applied === 0 },
        );
        applied += 1;
      }
      if (applied > 0) return;
      setFormError(
        e.status === 0
          ? rateText.errors.network
          : e.status === 403
            ? rateText.errors.pastDay
            : (e.message ?? rateText.errors.generic),
      );
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A double press of Enter must never send the day twice.
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  const yesterdayLabel = formatDate(yesterday.date);

  return (
    <form
      method="post"
      noValidate
      onSubmit={onSubmit}
      aria-busy={busy || undefined}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {canManage ? t.keyboardHint : t.readOnly}
        </p>
        {canManage ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={yesterday.data.length === 0 || busy}
            title={
              yesterday.data.length === 0
                ? t.noYesterday
                : t.copyYesterdayHint(yesterdayLabel)
            }
            onClick={copyYesterday}
          >
            <ClipboardCopy aria-hidden />
            {t.copyYesterday}
          </Button>
        ) : null}
      </div>

      {formError ? (
        <div
          role="alert"
          className="bg-destructive-soft border-destructive-border text-destructive flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
        >
          <AlertCircle aria-hidden className="mt-px size-4 flex-none" />
          {formError}
        </div>
      ) : null}

      <div
        ref={gridRef}
        onKeyDown={onGridKeyDown}
        className="bg-card text-card-foreground rounded-card overflow-hidden border"
      >
        <Table>
          <TableCaption className="sr-only">{t.caption}</TableCaption>
          <TableHeader className="bg-surface-muted/60">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className={cn(
                      "text-muted-foreground h-11 px-3 text-xs font-semibold tracking-wide uppercase",
                      header.column.id === "commodity"
                        ? "text-start"
                        : "text-end",
                    )}
                  >
                    <table.FlexRender header={header} />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-transparent">
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-3 py-2 align-top",
                      cell.column.id === "commodity"
                        ? "text-start"
                        : "text-end",
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canManage ? (
        <div className="bg-background/95 sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t px-1 py-3 backdrop-blur">
          {isDirty ? (
            <span
              className="text-muted-foreground me-auto text-sm"
              role="status"
            >
              {t.unsaved}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || busy}
            onClick={() => {
              setFormError(null);
              form.reset();
            }}
          >
            {t.discard}
          </Button>
          <Button
            ref={saveRef}
            type="submit"
            disabled={busy}
            className="gap-2 font-semibold"
          >
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {busy ? t.saving : t.save}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function CommodityCell({
  control,
  index,
  commodity,
}: {
  control: Control<RatesFormValues>;
  index: number;
  commodity: Commodity;
}) {
  const unit = useWatch({ control, name: `rows.${index}.rateUnit` });
  return (
    <div className="flex min-w-36 flex-col py-1.5">
      <CommodityName
        name={commodity.name}
        nameUr={commodity.nameUr}
        className="font-semibold"
      />
      <span className="text-muted-foreground text-xs">{perUnitText[unit]}</span>
    </div>
  );
}

function RateCell({
  control,
  index,
  field,
  name,
  readOnly,
}: {
  control: Control<RatesFormValues>;
  index: number;
  field: RateField;
  name: string;
  readOnly: boolean;
}) {
  const { field: input, fieldState } = useController({
    control,
    name: `rows.${index}.${field}`,
  });
  const label = t.inputLabel(field, name);
  const errorId = `rate-${index}-${field}-error`;

  if (readOnly) {
    return (
      <span aria-label={label} className="inline-block py-2 tabular-nums">
        {formatRs(input.value) || rateText.none}
      </span>
    );
  }

  return (
    <div className="ms-auto flex w-32 flex-col items-end gap-1">
      <Input
        {...input}
        {...{ [CELL_ATTRIBUTE]: "" }}
        aria-label={label}
        aria-invalid={fieldState.invalid || undefined}
        aria-describedby={fieldState.error ? errorId : undefined}
        inputMode="decimal"
        autoComplete="off"
        dir="ltr"
        placeholder={field === "avgRate" ? rateText.none : "0"}
        onFocus={(event) => event.currentTarget.select()}
        className="rounded-field bg-card h-10 text-end tabular-nums"
      />
      {fieldState.error ? (
        <p id={errorId} className="text-destructive text-end text-xs">
          {fieldState.error.message}
        </p>
      ) : null}
    </div>
  );
}
