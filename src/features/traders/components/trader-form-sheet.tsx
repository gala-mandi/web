"use client";

import { bidi } from "@/i18n/bidi";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  type ComponentProps,
  type FormEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { type Control, Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { AdornedInput } from "@/components/adorned-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  applyServerErrors,
  type ConflictFields,
} from "@/features/staff/form-errors";
import { toApiError } from "@/lib/api-error";
import { useCreateTrader, useUpdateTrader } from "../hooks";
import {
  emptyTraderValues,
  toCreateInput,
  toTraderFormValues,
  toUpdateInput,
  type TraderField,
  traderFields,
  traderFormSchema,
  type TradersTranslator,
  type TraderFormValues,
} from "../schemas";
import {
  balanceTypes,
  type Trader,
  type TraderType,
  traderTypes,
} from "../types";
import { useReturnFocus } from "@/hooks/use-return-focus";

const inputClass = "rounded-field h-[50px] bg-card";

/** 409 codes of the traders API and the field they belong to. */
const traderConflicts = (t: TradersTranslator): ConflictFields => ({
  PHONE_TAKEN: { field: "phone", message: t("errors.phoneTaken") },
});

export interface TraderFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The trader to edit; leave out (or null) to add a new one. */
  trader?: Trader | null;
  /** Add only: values to start with, e.g. the name typed in the picker. */
  prefill?: { name?: string; type?: TraderType };
  /** Gets the saved trader, after the toast and before the sheet closes. */
  onSaved?: (trader: Trader) => void;
}

/** The end side of the screen: right in English, left in Urdu (RTL). */
function endSide(): "left" | "right" {
  return typeof document !== "undefined" &&
    document.documentElement.dir === "rtl"
    ? "left"
    : "right";
}

/**
 * Side sheet to add or edit a trader, for fast entry without leaving the
 * page. Server field errors (400, 409 `PHONE_TAKEN`) land on their field.
 */
export function TraderFormSheet({
  open,
  onOpenChange,
  trader = null,
  prefill,
  onSaved,
}: TraderFormSheetProps) {
  const t = useTranslations("traders");
  const [busy, setBusy] = useState(false);
  const returnFocus = useReturnFocus();

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return;
        onOpenChange(next);
      }}
    >
      <SheetContent
        {...returnFocus}
        side={endSide()}
        className="w-full gap-0 p-0 data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b px-5 py-4 pe-12">
          <SheetTitle className="font-heading text-lg font-bold">
            {trader
              ? t("form.editTitle", { name: bidi(trader.name) })
              : t("form.addTitle")}
          </SheetTitle>
          <SheetDescription>
            {trader ? t("form.editDescription") : t("form.addDescription")}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <TraderForm
            trader={trader}
            prefill={prefill}
            onBusyChange={setBusy}
            onCancel={() => onOpenChange(false)}
            onSaved={(saved) => {
              onSaved?.(saved);
              onOpenChange(false);
            }}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TraderForm({
  trader,
  prefill,
  onBusyChange,
  onCancel,
  onSaved,
}: {
  trader: Trader | null;
  prefill?: { name?: string; type?: TraderType };
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
  onSaved: (trader: Trader) => void;
}) {
  const t = useTranslations("traders");
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreateTrader();
  const update = useUpdateTrader();
  const inFlight = useRef(false);

  const form = useForm<TraderFormValues>({
    resolver: zodResolver(traderFormSchema(t)),
    defaultValues: trader
      ? toTraderFormValues(trader)
      : emptyTraderValues(prefill),
  });
  const busy =
    form.formState.isSubmitting || create.isPending || update.isPending;

  const submit = async (values: TraderFormValues) => {
    setFormError(null);
    try {
      let saved: Trader;
      if (trader) {
        const input = toUpdateInput(values, form.formState.dirtyFields);
        if (Object.keys(input).length === 0) {
          toast.info(t("form.nothingChanged"));
          onCancel();
          return;
        }
        saved = await update.mutateAsync({ id: trader.id, input });
        toast.success(t("form.saved", { name: bidi(saved.name) }));
      } else {
        saved = await create.mutateAsync(toCreateInput(values));
        toast.success(t("form.added", { name: bidi(saved.name) }));
      }
      onSaved(saved);
    } catch (error) {
      const e = toApiError(error);
      if (
        !applyServerErrors(e, form.setError, traderFields, {
          conflicts: traderConflicts(t),
          fallback: t("errors.generic"),
        })
      ) {
        setFormError(
          e.status === 0
            ? t("errors.network")
            : (e.message ?? t("errors.generic")),
        );
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The sheet may sit inside another form (the picker in a purchase form):
    // React bubbles submit through portals, so stop it here.
    event.stopPropagation();
    // A double click must never add the trader twice.
    if (inFlight.current) return;
    inFlight.current = true;
    onBusyChange(true);
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
      onBusyChange(false);
    }
  };

  return (
    <form
      method="post"
      noValidate
      onSubmit={onSubmit}
      aria-busy={busy || undefined}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-5 py-5">
        {formError ? (
          <div
            role="alert"
            className="bg-destructive-soft border-destructive-border text-destructive flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
          >
            <AlertCircle aria-hidden className="mt-px size-4 flex-none" />
            {formError}
          </div>
        ) : null}

        <Section title={t("form.sections.basic")}>
          <TypeField control={form.control} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="name"
              label={t("form.name")}
              placeholder={t("form.namePlaceholder")}
              dir="auto"
              autoComplete="off"
              autoFocus
            />
            <TextField
              control={form.control}
              name="fatherName"
              label={t("form.fatherName")}
              optional
              dir="auto"
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="phone"
              label={t("form.phone")}
              optional
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="off"
              placeholder={t("form.phonePlaceholder")}
            />
            <TextField
              control={form.control}
              name="cnic"
              label={t("form.cnic")}
              optional
              inputMode="numeric"
              dir="ltr"
              autoComplete="off"
              placeholder={t("form.cnicPlaceholder")}
            />
          </div>
        </Section>

        <Section title={t("form.sections.address")}>
          <TextField
            control={form.control}
            name="village"
            label={t("form.village")}
            optional
            dir="auto"
          />
          <TextField
            control={form.control}
            name="address"
            label={t("form.address")}
            optional
            multiline
          />
        </Section>

        <Section title={t("form.sections.opening")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="openingBalance"
              label={t("form.openingBalance")}
              hint={t("form.openingBalanceHint")}
              optional
              inputMode="decimal"
              dir="ltr"
              placeholder="0"
              prefix={t("form.currency")}
            />
            <TextField
              control={form.control}
              name="creditLimit"
              label={t("form.creditLimit")}
              hint={t("form.creditLimitHint")}
              optional
              inputMode="decimal"
              dir="ltr"
              prefix={t("form.currency")}
            />
          </div>
          <BalanceTypeField control={form.control} />
        </Section>

        <Section title={t("form.sections.notes")}>
          <TextField
            control={form.control}
            name="notes"
            label={t("form.notes")}
            optional
            multiline
          />
          {trader ? <ActiveField control={form.control} /> : null}
        </Section>
      </div>

      <SheetFooter className="bg-popover flex-row justify-end border-t px-5 py-3">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={busy}
          onClick={onCancel}
        >
          {t("form.cancel")}
        </Button>
        <Button
          type="submit"
          className="h-10 gap-2 px-4 font-semibold"
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {busy ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : null}
          {busy
            ? t("form.saving")
            : trader
              ? t("form.submitEdit")
              : t("form.submitAdd")}
        </Button>
      </SheetFooter>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <FieldSet className="gap-4">
      <FieldLegend className="font-heading text-foreground mb-3 text-[15px] font-bold">
        {title}
      </FieldLegend>
      {children}
    </FieldSet>
  );
}

function OptionalMark() {
  const t = useTranslations("traders");
  return (
    <span className="text-muted-foreground text-xs font-normal">
      ({t("form.optional")})
    </span>
  );
}

type InputProps = Omit<ComponentProps<"input">, "name" | "prefix" | "children">;

function TextField({
  control,
  name,
  label,
  hint,
  optional,
  multiline,
  prefix,
  ...inputProps
}: {
  control: Control<TraderFormValues>;
  name: Exclude<TraderField, "type" | "openingBalanceType" | "isActive">;
  label: string;
  hint?: string;
  optional?: boolean;
  multiline?: boolean;
  prefix?: string;
} & InputProps) {
  const id = `trader-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const describedBy =
          [hint && `${id}-hint`, fieldState.error && `${id}-error`]
            .filter(Boolean)
            .join(" ") || undefined;
        const common = {
          ...field,
          id,
          "aria-invalid": fieldState.invalid,
          "aria-describedby": describedBy,
        };
        return (
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel htmlFor={id}>
              {label}
              {optional ? <OptionalMark /> : null}
            </FieldLabel>
            {multiline ? (
              <Textarea
                {...common}
                dir="auto"
                rows={3}
                className="rounded-field bg-card"
              />
            ) : (
              <AdornedInput
                {...inputProps}
                {...common}
                prefix={prefix}
                className={inputClass}
              />
            )}
            {hint ? (
              <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
            ) : null}
            <FieldError id={`${id}-error`} errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}

function TypeField({ control }: { control: Control<TraderFormValues> }) {
  const t = useTranslations("traders");
  return (
    <Controller
      name="type"
      control={control}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid} className="gap-2">
          <FieldLegend variant="label" className="mb-0">
            {t("form.type")}
          </FieldLegend>
          <RadioGroup
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            className="grid gap-2 sm:grid-cols-3"
          >
            {traderTypes.map((type) => (
              <FieldLabel
                key={type}
                htmlFor={`trader-type-${type}`}
                className="rounded-field has-data-checked:border-primary has-data-checked:bg-primary/5 border p-3"
              >
                <Field orientation="horizontal" className="gap-2.5">
                  <RadioGroupItem
                    value={type}
                    id={`trader-type-${type}`}
                    aria-describedby={`trader-type-${type}-hint`}
                  />
                  <FieldContent className="gap-0">
                    <span className="font-semibold">{t(`types.${type}`)}</span>
                    <span
                      id={`trader-type-${type}-hint`}
                      className="text-muted-foreground text-xs font-normal"
                    >
                      {t(`typeHints.${type}`)}
                    </span>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
          <FieldError errors={[fieldState.error]} />
        </FieldSet>
      )}
    />
  );
}

function BalanceTypeField({ control }: { control: Control<TraderFormValues> }) {
  const t = useTranslations("traders");
  return (
    <Controller
      name="openingBalanceType"
      control={control}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid} className="gap-2">
          <FieldLegend variant="label" className="mb-0">
            {t("form.openingBalanceType")}
          </FieldLegend>
          <RadioGroup
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            className="grid gap-2 sm:grid-cols-2"
          >
            {balanceTypes.map((side) => (
              <FieldLabel
                key={side}
                htmlFor={`trader-balance-${side}`}
                className="rounded-field has-data-checked:border-primary has-data-checked:bg-primary/5 border p-3"
              >
                <Field orientation="horizontal" className="gap-2.5">
                  <RadioGroupItem
                    value={side}
                    id={`trader-balance-${side}`}
                    aria-describedby={`trader-balance-${side}-hint`}
                  />
                  <FieldContent className="gap-0">
                    <span className="font-semibold">
                      {t(`form.balanceTypes.${side}.label`)}
                    </span>
                    <span
                      id={`trader-balance-${side}-hint`}
                      className="text-muted-foreground text-xs font-normal"
                    >
                      {t(`form.balanceTypes.${side}.hint`)}
                    </span>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
          <FieldError errors={[fieldState.error]} />
        </FieldSet>
      )}
    />
  );
}

function ActiveField({ control }: { control: Control<TraderFormValues> }) {
  const t = useTranslations("traders");
  return (
    <Controller
      name="isActive"
      control={control}
      render={({ field }) => (
        <Field orientation="horizontal" className="gap-3">
          <Checkbox
            id="trader-isActive"
            ref={field.ref}
            name={field.name}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            onBlur={field.onBlur}
            aria-describedby="trader-isActive-hint"
          />
          <FieldContent className="gap-0.5">
            <FieldLabel htmlFor="trader-isActive">
              {t("form.isActive")}
            </FieldLabel>
            <FieldDescription id="trader-isActive-hint">
              {t("form.isActiveHint")}
            </FieldDescription>
          </FieldContent>
        </Field>
      )}
    />
  );
}
