"use client";

import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import {
  type Control,
  Controller,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CommodityCombobox } from "@/features/commodities/components/commodity-combobox";
import type { CommodityLookupItem } from "@/features/commodities/types";
import type { Rate } from "@/features/rates/types";
import { useFormat } from "@/lib/use-format";
import { kgToMaund } from "@/lib/units";
import { cn } from "@/lib/utils";
import {
  itemWeightKg,
  type PurchaseItemFormValues,
  type WeightUnit,
  weightUnits,
} from "../schemas";
import type { RateUnit } from "../types";
import { ENTER_CELL } from "./keyboard";

/**
 * One item row of a parchi form (commodity, bags, weight in maund or kg,
 * rate pre-filled from today's rate), shared by the purchase and the sale
 * form. Ids and test ids start with `idPrefix` ("purchase", "sale").
 */

export const inputClass = "rounded-field bg-card h-11";
const selectClass =
  "rounded-field bg-card border-input focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full border px-2 text-sm outline-none focus-visible:ring-3 aria-invalid:border-destructive";

/** Any parchi form: its items are (at least) the purchase item fields. */
export interface ItemsFormValues {
  items: PurchaseItemFormValues[];
}

/** `purchase-item-0-weight`: the id of one cell of a row. */
export const itemCellId = (idPrefix: string, index: number, field: string) =>
  `${idPrefix}-item-${index}-${field}`;

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

export interface ItemRowProps<T extends ItemsFormValues> {
  /** "purchase" or "sale": the start of every id in the row. */
  idPrefix: string;
  index: number;
  form: UseFormReturn<T>;
  /** Today's rates, for the pre-filled rate. */
  rates: readonly Rate[] | undefined;
  /** This row's amount from the live total. */
  amount: string | null;
  canRemove: boolean;
  onRemove: () => void;
}

export function ItemRow<T extends ItemsFormValues>({
  idPrefix,
  index,
  form: anyForm,
  rates,
  amount,
  canRemove,
  onRemove,
}: ItemRowProps<T>) {
  const { formatKg, formatMaund, formatRs } = useFormat();
  const t = useTranslations("purchases");
  // The row only touches `items.<index>`, which every parchi form has.
  const form = anyForm as unknown as UseFormReturn<ItemsFormValues>;
  const n = index + 1;
  const id = (field: string) => itemCellId(idPrefix, index, field);
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
        ? t("form.todaysRate")
        : t("form.rateChanged", {
            rate: `${formatRs(today.rate)} ${t(`perUnit.${today.rateUnit}`)}`,
          })
      : t("form.noRateToday")
    : null;

  // Visible labels say "Bags"; screen readers hear "Bags, Item 2".
  const name = (text: string) =>
    t("form.fieldOfItem", { field: text, item: t("form.itemLabel", { n }) });

  return (
    <fieldset
      data-testid={`${idPrefix}-item-${index}`}
      className="rounded-card bg-card grid gap-3 border p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[minmax(10rem,1.4fr)_5.5rem_minmax(9rem,1fr)_minmax(9rem,1fr)_auto]"
    >
      <legend className="sr-only">{t("form.itemLabel", { n })}</legend>

      <Controller
        control={control}
        name={`items.${index}.commodity`}
        render={({ field, fieldState }) => (
          <Field
            data-invalid={fieldState.invalid || undefined}
            className="gap-1.5"
          >
            <FieldLabel htmlFor={id("commodity")}>
              {t("form.commodity")}
            </FieldLabel>
            <span id={id("commodity-name")} className="sr-only">
              {name(t("form.commodity"))}
            </span>
            <CommodityCombobox
              id={id("commodity")}
              aria-labelledby={id("commodity-name")}
              value={field.value}
              onChange={(commodity) => {
                field.onChange(commodity);
                field.onBlur();
                onCommodity(commodity);
              }}
              placeholder={t("form.commodityPlaceholder")}
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
        <FieldLabel htmlFor={id("bags")}>{t("form.bags")}</FieldLabel>
        <Input
          id={id("bags")}
          aria-label={name(t("form.bags"))}
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
        <FieldLabel htmlFor={id("weight")}>{t("form.weight")}</FieldLabel>
        <div className="flex gap-1.5">
          <Input
            id={id("weight")}
            aria-label={name(t("form.weight"))}
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
            label={name(t("form.weightUnit"))}
            units={weightUnits}
            onPick={(unit) => onWeightUnit(unit as WeightUnit)}
          />
        </div>
        {weightKg ? (
          <p
            className="text-muted-foreground text-xs"
            data-testid={`${idPrefix}-item-${index}-kg`}
          >
            {t("form.weightIs", {
              kg: formatKg(weightKg),
              maund: formatMaund(weightKg),
            })}
          </p>
        ) : null}
        <FieldError errors={[errors?.weight]} className="text-xs" />
      </Field>

      <Field
        data-invalid={Boolean(errors?.rate) || undefined}
        className="gap-1.5"
      >
        <FieldLabel htmlFor={id("rate")}>{t("form.rate")}</FieldLabel>
        <div className="flex gap-1.5">
          <Input
            id={id("rate")}
            aria-label={name(t("form.rate"))}
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
            label={name(t("form.rateUnit"))}
            units={["maund", "kg", "bag"]}
            onPick={(unit) => setRow("rateUnit", unit as RateUnit)}
          />
        </div>
        {rateHint ? (
          <p
            className="text-muted-foreground text-xs"
            data-testid={`${idPrefix}-item-${index}-rate-hint`}
          >
            {rateHint}
          </p>
        ) : null}
        <FieldError errors={[errors?.rate]} className="text-xs" />
      </Field>

      <div className="flex items-end justify-between gap-2 sm:col-span-2 xl:col-span-1 xl:flex-col xl:items-end">
        <p className="flex flex-col text-end text-sm">
          <span className="text-muted-foreground text-xs">
            {t("form.amount")}
          </span>
          <span
            dir="auto"
            className="font-semibold tabular-nums"
            data-testid={`${idPrefix}-item-${index}-amount`}
          >
            {amount ? formatRs(amount) : t("none")}
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!canRemove}
          aria-label={t("form.removeItem", { n })}
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
  control: Control<ItemsFormValues>;
  name: `items.${number}.weightUnit` | `items.${number}.rateUnit`;
  label: string;
  units: readonly RateUnit[];
  onPick: (unit: RateUnit) => void;
}) {
  const t = useTranslations("purchases");
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
          {t(`units.${unit}`)}
        </option>
      ))}
    </select>
  );
}
