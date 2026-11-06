"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
  Controller,
  type UseFormReturn,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CommodityCombobox } from "@/features/commodities/components/commodity-combobox";
import type { CommodityLookupItem } from "@/features/commodities/types";
import { useTodayRates } from "@/features/rates/hooks";
import type { Rate } from "@/features/rates/types";
import { TraderCombobox } from "@/features/traders/components/trader-combobox";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { type ApiError, toApiError } from "@/lib/api-error";
import { useCan } from "@/lib/can";
import { formatKg, formatMaund, formatRs } from "@/lib/format";
import { purchaseRoutes } from "@/lib/routes";
import { kgToMaund } from "@/lib/units";
import { cn } from "@/lib/utils";
import { useCreatePurchase, useUpdatePurchase } from "../hooks";
import { newIdempotencyKey } from "../idempotency";
import {
  emptyItem,
  emptyPurchaseValues,
  isBlankItem,
  itemWeightKg,
  type PurchaseFormValues,
  purchaseFormSchema,
  type PurchaseItemFormValues,
  toFormField,
  toPurchaseFormValues,
  toPurchaseInput,
  type WeightUnit,
  weightUnits,
} from "../schemas";
import { perUnitText, purchaseText, unitText } from "../text";
import { liveTotals, savedItemCharges, savedRates } from "../totals";
import type { Purchase, RateUnit } from "../types";
import { BreakdownLines } from "./breakdown-lines";

const t = purchaseText.form;
const inputClass = "rounded-field bg-card h-11";
const selectClass =
  "rounded-field bg-card border-input focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full border px-2 text-sm outline-none focus-visible:ring-3 aria-invalid:border-destructive";

/** Marks the inputs where Enter moves on (bags, weight, rate). */
const ENTER_CELL = "data-enter-cell";
/** What Enter walks through, in page order: also each commodity button. */
const CELLS = `[${ENTER_CELL}], button[id^="purchase-item-"][id$="-commodity"]`;

/** What happens after a successful save. */
export type SaveIntent = "save" | "print" | "new";

const TRADER_ID = "purchase-trader";
const itemId = (index: number, field: string) =>
  `purchase-item-${index}-${field}`;

/**
 * The rate today's rates give a commodity: the average when one was entered,
 * else the max. `null` when the commodity has no rate today.
 */
export function todaysRate(
  rates: readonly Rate[] | undefined,
  commodityId: string | undefined,
): { rate: string; rateUnit: RateUnit } | null {
  const row = rates?.find((r) => r.commodityId === commodityId);
  if (!row) return null;
  return {
    rate: trimMoney(row.avgRate ?? row.maxRate),
    rateUnit: row.rateUnit,
  };
}

/** "4000.00" → "4000", "4000.50" → "4000.5": a rate as typed. */
function trimMoney(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/** Message for an error that no form field shows. */
function generalMessage(error: ApiError): string {
  const e = purchaseText.errors;
  if (error.status === 0) return e.network;
  if (error.code === "DAY_CLOSED") return e.dayClosed;
  if (error.code === "PURCHASE_CANCELLED") return e.cancelled;
  if (error.status === 403) return e.forbidden;
  return error.message ?? e.generic;
}

export interface PurchaseFormProps {
  /** Today in Asia/Karachi (the latest date allowed). */
  today: string;
  /** The saved purchase to edit; leave out for a new one. */
  purchase?: Purchase;
}

/**
 * Purchase entry for busy mandi hours: kissan, date and notes, then one row
 * per commodity (bags, weight in maund or kg, rate pre-filled from today's
 * rate) and a live total from the same calculator the server uses. The
 * whole bill can be typed without the mouse: Enter moves on, Enter on the
 * last rate adds an item, Ctrl+S saves, Ctrl+P saves and prints.
 *
 * Every save of a new purchase carries the form's Idempotency-Key, kept
 * until the save succeeds, so pressing Save again after a dropped
 * connection never makes a second purchase.
 */
export function PurchaseForm({ today, purchase }: PurchaseFormProps) {
  const router = useRouter();
  const editing = Boolean(purchase);
  const canSeeRates = useCan("rate.view");
  const todayRates = useTodayRates(canSeeRates);
  const create = useCreatePurchase();
  const update = useUpdatePurchase();

  // One key per bill; a retry of the same bill sends it again.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const inFlight = useRef(false);
  const pendingFocus = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const schema = useMemo(() => purchaseFormSchema(today), [today]);
  const defaultValues = useMemo(
    () =>
      purchase
        ? toPurchaseFormValues(purchase, savedItemCharges(purchase.charges))
        : emptyPurchaseValues(today),
    [purchase, today],
  );
  // An edit keeps the bill's own charge rates, as the server does.
  const manual = useMemo(
    () => (purchase ? savedRates(purchase.charges) : {}),
    [purchase],
  );

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const items = useWatch({ control: form.control, name: "items" });
  const live = useMemo(() => liveTotals(items, manual), [items, manual]);
  const { isDirty, errors } = form.formState;
  const busy =
    form.formState.isSubmitting || create.isPending || update.isPending;

  useUnsavedChangesWarning(isDirty && !leaving, t.leaveWarning);

  // Focus the new row's commodity once it is on the page.
  useEffect(() => {
    if (pendingFocus.current === null) return;
    document.getElementById(itemId(pendingFocus.current, "commodity"))?.focus();
    pendingFocus.current = null;
  }, [fields.length]);

  const addItem = () => {
    const last = items.at(-1);
    pendingFocus.current = fields.length;
    append(emptyItem(last?.weightUnit), { shouldFocus: false });
  };

  const save = async (values: PurchaseFormValues, intent: SaveIntent) => {
    setFormError(null);
    const { input, rowIndexes } = toPurchaseInput(values);
    try {
      let saved: Purchase;
      if (purchase) {
        saved = await update.mutateAsync({
          id: purchase.id,
          input,
          oldTraderId: purchase.trader.id,
        });
        toast.success(t.updated(saved.billNo));
      } else {
        ({ purchase: saved } = await create.mutateAsync({
          input,
          idempotencyKey,
        }));
        toast.success(t.saved(saved.billNo));
      }

      if (intent === "new") {
        // A new bill gets a new key; the date stays for the next bill.
        setIdempotencyKey(newIdempotencyKey());
        form.reset(emptyPurchaseValues(values.purchaseDate));
        document.getElementById(TRADER_ID)?.focus();
        return;
      }
      setLeaving(true);
      router.push(
        intent === "print"
          ? purchaseRoutes.print(saved.id)
          : purchaseRoutes.detail(saved.id),
      );
    } catch (error) {
      const e = toApiError(error);
      const unplaced: string[] = [];
      let placed = 0;
      for (const { field, message } of e.errors) {
        const name = toFormField(field, rowIndexes);
        if (!name) {
          if (message) unplaced.push(message);
          continue;
        }
        form.setError(
          name as Parameters<typeof form.setError>[0],
          { type: "server", message: message || purchaseText.errors.generic },
          { shouldFocus: placed === 0 },
        );
        placed += 1;
      }
      if (placed > 0 && unplaced.length === 0) return;
      const message = unplaced.length ? unplaced.join(" ") : generalMessage(e);
      setFormError(message);
      toast.error(message);
    }
  };

  const submit = async (intent: SaveIntent) => {
    // A double press (or Ctrl+S while saving) never sends twice.
    if (inFlight.current || leaving) return;
    inFlight.current = true;
    try {
      await form.handleSubmit((values) => save(values, intent))();
    } finally {
      inFlight.current = false;
    }
  };
  // The shortcut listener below always calls the latest `submit`.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  // A new bill starts on the kissan (the date is already today).
  useEffect(() => {
    if (!editing) document.getElementById(TRADER_ID)?.focus();
  }, [editing]);

  // Ctrl+S saves, Ctrl+P saves and prints (instead of printing the form).
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== "s" && key !== "p") return;
      // The quick-add trader sheet has its own form.
      const target = event.target as Element | null;
      if (target?.closest?.("[role=dialog]")) return;
      event.preventDefault();
      void submitRef.current(key === "p" ? "print" : "save");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit("save");
  };

  /** Enter walks commodity → bags → weight → rate → next item. */
  const onItemsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    // Enter on the commodity button opens its search.
    if (!target.hasAttribute(ENTER_CELL)) return;
    event.preventDefault();
    const cells = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(CELLS),
    );
    const at = cells.indexOf(target);
    const next = at + (event.shiftKey ? -1 : 1);
    if (next >= 0 && next < cells.length) {
      cells[next].focus();
      return;
    }
    if (next < 0) return;
    const last = items.at(-1);
    if (last && !isBlankItem(last) && fields.length < 100) addItem();
    else
      formRef.current
        ?.querySelector<HTMLButtonElement>("button[type=submit]")
        ?.focus();
  };

  const itemsError = errors.items?.message ?? errors.items?.root?.message;

  return (
    <form
      ref={formRef}
      method="post"
      noValidate
      onSubmit={onSubmit}
      aria-busy={busy || undefined}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        {formError ? (
          <div
            role="alert"
            data-testid="purchase-form-error"
            className="bg-destructive-soft border-destructive-border text-destructive flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
          >
            <AlertCircle aria-hidden className="mt-px size-4 flex-none" />
            {formError}
          </div>
        ) : null}

        <section
          aria-labelledby="purchase-header-title"
          className="rounded-card bg-card flex flex-col gap-4 border p-4 sm:p-5"
        >
          <h2
            id="purchase-header-title"
            className="font-heading text-lg font-bold"
          >
            {t.header}
          </h2>
          <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <Field data-invalid={Boolean(errors.purchaseDate) || undefined}>
              <FieldLabel htmlFor="purchase-date">{t.date}</FieldLabel>
              <Input
                id="purchase-date"
                type="date"
                dir="ltr"
                max={today}
                aria-invalid={Boolean(errors.purchaseDate) || undefined}
                className={inputClass}
                {...form.register("purchaseDate")}
              />
              <FieldError errors={[errors.purchaseDate]} />
            </Field>
            <Controller
              control={form.control}
              name="trader"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor={TRADER_ID}>{t.trader}</FieldLabel>
                  <TraderCombobox
                    id={TRADER_ID}
                    type="kissan"
                    value={field.value}
                    onChange={(trader) => {
                      field.onChange(trader);
                      field.onBlur();
                    }}
                    placeholder={t.traderPlaceholder}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <Field data-invalid={Boolean(errors.notes) || undefined}>
            <FieldLabel htmlFor="purchase-notes">{t.notes}</FieldLabel>
            <Textarea
              id="purchase-notes"
              rows={1}
              dir="auto"
              placeholder={t.notesPlaceholder}
              aria-invalid={Boolean(errors.notes) || undefined}
              className="rounded-field bg-card min-h-11"
              {...form.register("notes")}
            />
            <FieldError errors={[errors.notes]} />
          </Field>
        </section>

        <section
          aria-labelledby="purchase-items-title"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="purchase-items-title"
              className="font-heading text-lg font-bold"
            >
              {t.items}
            </h2>
            <p className="text-muted-foreground text-xs">{t.keyboardHint}</p>
          </div>
          <div onKeyDown={onItemsKeyDown} className="flex flex-col gap-3">
            {fields.map((row, index) => (
              <ItemRow
                key={row.id}
                index={index}
                form={form}
                rates={todayRates.data?.data}
                amount={live.itemAmounts[index] ?? null}
                canRemove={fields.length > 1}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
          {itemsError ? (
            <p role="alert" className="text-destructive text-sm">
              {itemsError}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-fit gap-2"
            disabled={fields.length >= 100}
            onClick={addItem}
          >
            <Plus aria-hidden />
            {t.addItem}
          </Button>
        </section>
      </div>

      <aside
        aria-labelledby="purchase-total-title"
        className="rounded-card bg-card flex flex-col gap-4 border p-4 sm:p-5 lg:sticky lg:top-20"
      >
        <h2
          id="purchase-total-title"
          className="font-heading text-lg font-bold"
        >
          {purchaseText.breakdown.title}
        </h2>
        <div aria-live="polite">
          {live.totals ? (
            <BreakdownLines values={live.totals} />
          ) : (
            <p
              className={cn(
                "text-sm",
                live.error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {live.error ?? purchaseText.breakdown.empty}
            </p>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {purchaseText.breakdown.preview}
        </p>
        <div className="flex flex-col gap-2 border-t pt-4">
          <Button
            type="submit"
            disabled={busy}
            className="h-11 gap-2 font-semibold"
          >
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {busy ? t.saving : t.save}
            <kbd aria-hidden className="ms-auto text-xs opacity-70">
              Ctrl S
            </kbd>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="h-11 gap-2"
            onClick={() => void submit("print")}
          >
            <Printer aria-hidden />
            {t.saveAndPrint}
            <kbd aria-hidden className="text-muted-foreground ms-auto text-xs">
              Ctrl P
            </kbd>
          </Button>
          {editing ? null : (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="h-11 gap-2"
              onClick={() => void submit("new")}
            >
              <Plus aria-hidden />
              {t.saveAndNew}
            </Button>
          )}
        </div>
      </aside>
    </form>
  );
}

interface ItemRowProps {
  index: number;
  form: UseFormReturn<PurchaseFormValues>;
  /** Today's rates, for the pre-filled rate. */
  rates: readonly Rate[] | undefined;
  /** This row's amount from the live total. */
  amount: string | null;
  canRemove: boolean;
  onRemove: () => void;
}

function ItemRow({
  index,
  form,
  rates,
  amount,
  canRemove,
  onRemove,
}: ItemRowProps) {
  const n = index + 1;
  const { control, register, setValue, getValues, getFieldState } = form;
  const errors = form.formState.errors.items?.[index];
  const item = useWatch({ control, name: `items.${index}` });
  const today = todaysRate(rates, item?.commodity?.id);

  const setRow = <K extends keyof PurchaseItemFormValues>(
    field: K,
    value: PurchaseItemFormValues[K],
  ) => {
    const name = `items.${index}.${field}` as const;
    setValue(name, value as never, {
      shouldDirty: true,
      shouldValidate: getFieldState(name).isTouched,
    });
  };

  /** Picking a commodity pre-fills today's rate and the usual units. */
  const onCommodity = (commodity: CommodityLookupItem | null) => {
    if (!commodity) return;
    const rate = todaysRate(rates, commodity.id);
    const row = getValues(`items.${index}`);
    if (rate) {
      setRow("rate", rate.rate);
      setRow("rateUnit", rate.rateUnit);
    } else if (!row.rate.trim()) {
      setRow("rateUnit", commodity.defaultUnit);
    }
    if (!row.weight.trim()) {
      setRow("weightUnit", commodity.defaultUnit === "kg" ? "kg" : "maund");
    }
  };

  /** Switching the unit converts what was typed, so the weight stays. */
  const onWeightUnit = (unit: WeightUnit) => {
    const row = getValues(`items.${index}`);
    if (unit === row.weightUnit) return;
    const kg = itemWeightKg(row);
    if (kg) {
      const converted = unit === "kg" ? kg : kgToMaund(kg);
      if (converted) setRow("weight", trimMoney(converted));
    }
    setRow("weightUnit", unit);
  };

  const weightKg = item ? itemWeightKg(item) : null;
  const rateHint = item?.commodity
    ? today
      ? today.rate === trimMoney(item.rate.trim() || "x") &&
        today.rateUnit === item.rateUnit
        ? purchaseText.form.todaysRate
        : t.rateChanged(
            `${formatRs(today.rate)} ${perUnitText[today.rateUnit]}`,
          )
      : t.noRateToday
    : null;

  // Visible labels say "Bags"; screen readers hear "Bags, Item 2".
  const name = (text: string) => `${text}, ${t.itemLabel(n)}`;

  return (
    <fieldset
      data-testid={`purchase-item-${index}`}
      className="rounded-card bg-card grid gap-3 border p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[minmax(10rem,1.4fr)_5.5rem_minmax(9rem,1fr)_minmax(9rem,1fr)_auto]"
    >
      <legend className="sr-only">{t.itemLabel(n)}</legend>

      <Controller
        control={control}
        name={`items.${index}.commodity`}
        render={({ field, fieldState }) => (
          <Field
            data-invalid={fieldState.invalid || undefined}
            className="gap-1.5"
          >
            <FieldLabel htmlFor={itemId(index, "commodity")}>
              {t.commodity}
            </FieldLabel>
            <span id={itemId(index, "commodity-name")} className="sr-only">
              {name(t.commodity)}
            </span>
            <CommodityCombobox
              id={itemId(index, "commodity")}
              aria-labelledby={itemId(index, "commodity-name")}
              value={field.value}
              onChange={(commodity) => {
                field.onChange(commodity);
                field.onBlur();
                onCommodity(commodity);
              }}
              placeholder={t.commodityPlaceholder}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} className="text-xs" />
          </Field>
        )}
      />

      <Field
        data-invalid={Boolean(errors?.bags) || undefined}
        className="gap-1.5"
      >
        <FieldLabel htmlFor={itemId(index, "bags")}>{t.bags}</FieldLabel>
        <Input
          id={itemId(index, "bags")}
          aria-label={name(t.bags)}
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          aria-invalid={Boolean(errors?.bags) || undefined}
          onFocus={(event) => event.currentTarget.select()}
          className={cn(inputClass, "text-end tabular-nums")}
          {...{ [ENTER_CELL]: "" }}
          {...register(`items.${index}.bags`)}
        />
        <FieldError errors={[errors?.bags]} className="text-xs" />
      </Field>

      <Field
        data-invalid={Boolean(errors?.weight) || undefined}
        className="gap-1.5"
      >
        <FieldLabel htmlFor={itemId(index, "weight")}>{t.weight}</FieldLabel>
        <div className="flex gap-1.5">
          <Input
            id={itemId(index, "weight")}
            aria-label={name(t.weight)}
            inputMode="decimal"
            autoComplete="off"
            dir="ltr"
            aria-invalid={Boolean(errors?.weight) || undefined}
            onFocus={(event) => event.currentTarget.select()}
            className={cn(inputClass, "min-w-0 flex-1 text-end tabular-nums")}
            {...{ [ENTER_CELL]: "" }}
            {...register(`items.${index}.weight`)}
          />
          <UnitSelect
            control={control}
            name={`items.${index}.weightUnit`}
            label={`${t.weightUnit}, ${t.itemLabel(n)}`}
            units={weightUnits}
            onPick={(unit) => onWeightUnit(unit as WeightUnit)}
          />
        </div>
        {weightKg ? (
          <p
            className="text-muted-foreground text-xs"
            data-testid={`purchase-item-${index}-kg`}
          >
            {t.weightIs(formatKg(weightKg), formatMaund(weightKg))}
          </p>
        ) : null}
        <FieldError errors={[errors?.weight]} className="text-xs" />
      </Field>

      <Field
        data-invalid={Boolean(errors?.rate) || undefined}
        className="gap-1.5"
      >
        <FieldLabel htmlFor={itemId(index, "rate")}>{t.rate}</FieldLabel>
        <div className="flex gap-1.5">
          <Input
            id={itemId(index, "rate")}
            aria-label={name(t.rate)}
            inputMode="decimal"
            autoComplete="off"
            dir="ltr"
            aria-invalid={Boolean(errors?.rate) || undefined}
            onFocus={(event) => event.currentTarget.select()}
            className={cn(inputClass, "min-w-0 flex-1 text-end tabular-nums")}
            {...{ [ENTER_CELL]: "" }}
            {...register(`items.${index}.rate`)}
          />
          <UnitSelect
            control={control}
            name={`items.${index}.rateUnit`}
            label={`${t.rateUnit}, ${t.itemLabel(n)}`}
            units={["maund", "kg", "bag"]}
            onPick={(unit) => setRow("rateUnit", unit as RateUnit)}
          />
        </div>
        {rateHint ? (
          <p
            className="text-muted-foreground text-xs"
            data-testid={`purchase-item-${index}-rate-hint`}
          >
            {rateHint}
          </p>
        ) : null}
        <FieldError errors={[errors?.rate]} className="text-xs" />
      </Field>

      <div className="flex items-end justify-between gap-2 sm:col-span-2 xl:col-span-1 xl:flex-col xl:items-end">
        <p className="flex flex-col text-end text-sm">
          <span className="text-muted-foreground text-xs">{t.amount}</span>
          <span
            dir="ltr"
            className="font-semibold tabular-nums"
            data-testid={`purchase-item-${index}-amount`}
          >
            {amount ? formatRs(amount) : purchaseText.none}
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!canRemove}
          aria-label={t.removeItem(n)}
          onClick={onRemove}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </fieldset>
  );
}

/** A native select: arrow keys change it without opening a menu. */
function UnitSelect({
  control,
  name,
  label,
  units,
  onPick,
}: {
  control: Control<PurchaseFormValues>;
  name: `items.${number}.weightUnit` | `items.${number}.rateUnit`;
  label: string;
  units: readonly RateUnit[];
  onPick: (unit: RateUnit) => void;
}) {
  const value = useWatch({ control, name });
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onPick(event.target.value as RateUnit)}
      className={cn(selectClass, "w-auto shrink-0")}
    >
      {units.map((unit) => (
        <option key={unit} value={unit}>
          {unitText[unit]}
        </option>
      ))}
    </select>
  );
}
