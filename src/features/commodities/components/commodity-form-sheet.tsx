"use client";

import { bidi } from "@/i18n/bidi";
import { useTranslations } from "next-intl";
import { categoryLabel, suggestedCategories } from "../categories";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, X } from "lucide-react";
import {
  type ComponentProps,
  type FormEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import {
  type Control,
  Controller,
  useForm,
  type UseFormSetFocus,
  type UseFormSetValue,
  useWatch,
} from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { units } from "@/features/settings/schemas";
import {
  applyServerErrors,
  type ConflictFields,
} from "@/features/staff/form-errors";
import { toApiError } from "@/lib/api-error";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import {
  useCreateCommodity,
  useShopCharges,
  useUpdateCommodity,
} from "../hooks";
import {
  type CommodityField,
  commodityFields,
  commodityFormSchema,
  type CommoditiesTranslator,
  type CommodityFormValues,
  emptyCommodityValues,
  toCommodityFormValues,
  toCreateInput,
  toUpdateInput,
} from "../schemas";
import {
  type ChargeField,
  chargeFields,
  type Commodity,
  type EffectiveCharges,
} from "../types";

const inputClass = "rounded-field h-11 bg-card";

/** 409 codes of the commodities API and the field they belong to. */
const commodityConflicts = (t: CommoditiesTranslator): ConflictFields => ({
  NAME_TAKEN: { field: "name", message: t("errors.nameTaken") },
});

export interface CommodityFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The commodity to edit; leave out (or null) to add a new one. */
  commodity?: Commodity | null;
  /** Gets the saved commodity, after the toast and before the sheet closes. */
  onSaved?: (commodity: Commodity) => void;
}

/** The end side of the screen: right in English, left in Urdu (RTL). */
function endSide(): "left" | "right" {
  return typeof document !== "undefined" &&
    document.documentElement.dir === "rtl"
    ? "left"
    : "right";
}

/**
 * Side sheet to add or edit a commodity. Server field errors (400, 409
 * `NAME_TAKEN`) land on their field.
 */
export function CommodityFormSheet({
  open,
  onOpenChange,
  commodity = null,
  onSaved,
}: CommodityFormSheetProps) {
  const t = useTranslations("commodities");
  const [busy, setBusy] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return;
        onOpenChange(next);
      }}
    >
      <SheetContent
        side={endSide()}
        className="w-full gap-0 p-0 data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b px-5 py-4 pe-12">
          <SheetTitle className="font-heading text-lg font-bold">
            {commodity
              ? t("form.editTitle", { name: bidi(commodity.name) })
              : t("form.addTitle")}
          </SheetTitle>
          <SheetDescription>
            {commodity ? t("form.editDescription") : t("form.addDescription")}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <CommodityForm
            commodity={commodity}
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

function CommodityForm({
  commodity,
  onBusyChange,
  onCancel,
  onSaved,
}: {
  commodity: Commodity | null;
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
  onSaved: (commodity: Commodity) => void;
}) {
  const t = useTranslations("commodities");
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreateCommodity();
  const update = useUpdateCommodity();
  const shopCharges = useShopCharges();
  const inFlight = useRef(false);

  const form = useForm<CommodityFormValues>({
    resolver: zodResolver(commodityFormSchema(t)),
    defaultValues: commodity
      ? toCommodityFormValues(commodity)
      : emptyCommodityValues(),
  });
  const busy =
    form.formState.isSubmitting || create.isPending || update.isPending;

  const submit = async (values: CommodityFormValues) => {
    setFormError(null);
    try {
      let saved: Commodity;
      if (commodity) {
        const input = toUpdateInput(values, form.formState.dirtyFields);
        if (Object.keys(input).length === 0) {
          toast.info(t("form.nothingChanged"));
          onCancel();
          return;
        }
        saved = await update.mutateAsync({ id: commodity.id, input });
        toast.success(t("form.saved", { name: bidi(saved.name) }));
      } else {
        saved = await create.mutateAsync(toCreateInput(values));
        toast.success(t("form.added", { name: bidi(saved.name) }));
      }
      onSaved(saved);
    } catch (error) {
      const e = toApiError(error);
      if (
        !applyServerErrors(e, form.setError, commodityFields, {
          conflicts: commodityConflicts(t),
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
    // The sheet may one day sit inside another form: React bubbles submit
    // through portals, so stop it here.
    event.stopPropagation();
    // A double click must never add the commodity twice.
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
              name="nameUr"
              label={t("form.nameUr")}
              optional
              placeholder={t("form.nameUrPlaceholder")}
              dir="rtl"
              lang="ur"
              autoComplete="off"
              className="font-urdu text-base leading-loose"
            />
          </div>
          <TextField
            control={form.control}
            name="category"
            label={t("form.category")}
            hint={t("form.categoryHint")}
            optional
            placeholder={t("form.categoryPlaceholder")}
            dir="auto"
            autoComplete="off"
            list="commodity-category-suggestions"
          />
          <datalist id="commodity-category-suggestions">
            {suggestedCategories.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(t, category)}
              </option>
            ))}
          </datalist>
          {commodity ? <ActiveField control={form.control} /> : null}
        </Section>

        <Section title={t("form.sections.units")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <UnitField control={form.control} />
            <TextField
              control={form.control}
              name="bagWeightKg"
              label={t("form.bagWeightKg")}
              hint={t("form.bagWeightHint")}
              optional
              inputMode="decimal"
              dir="ltr"
              placeholder={t("form.bagWeightPlaceholder")}
              suffix={t("form.kg")}
            />
          </div>
        </Section>

        <Section
          title={t("form.sections.charges")}
          description={t("form.chargesHint")}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {chargeFields.map((field) => (
              <ChargeInput
                key={field}
                control={form.control}
                setValue={form.setValue}
                setFocus={form.setFocus}
                name={field}
                shopCharges={shopCharges}
              />
            ))}
          </div>
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
            : commodity
              ? t("form.submitEdit")
              : t("form.submitAdd")}
        </Button>
      </SheetFooter>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <FieldSet className="gap-4">
      <FieldLegend className="font-heading text-foreground mb-0 text-[15px] font-bold">
        {title}
      </FieldLegend>
      {description ? (
        <FieldDescription className="-mt-2">{description}</FieldDescription>
      ) : null}
      {children}
    </FieldSet>
  );
}

function OptionalMark() {
  const t = useTranslations("commodities");
  return (
    <span className="text-muted-foreground text-xs font-normal">
      ({t("form.optional")})
    </span>
  );
}

type InputProps = Omit<ComponentProps<"input">, "name" | "prefix" | "children">;
type TextFieldName = Exclude<CommodityField, "defaultUnit" | "isActive">;

function TextField({
  control,
  name,
  label,
  hint,
  optional,
  prefix,
  suffix,
  className,
  end,
  ...inputProps
}: {
  control: Control<CommodityFormValues>;
  name: TextFieldName;
  label: string;
  hint?: string;
  optional?: boolean;
  prefix?: string;
  suffix?: string;
  /** Shown under the input after the hint, e.g. a "Use shop default" button. */
  end?: ReactNode;
} & InputProps) {
  const id = `commodity-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const describedBy =
          [hint && `${id}-hint`, fieldState.error && `${id}-error`]
            .filter(Boolean)
            .join(" ") || undefined;
        return (
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel htmlFor={id}>
              {label}
              {optional ? <OptionalMark /> : null}
            </FieldLabel>
            <div className="relative">
              {prefix ? (
                <span
                  aria-hidden
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm"
                >
                  {prefix}
                </span>
              ) : null}
              <Input
                {...inputProps}
                {...field}
                id={id}
                aria-invalid={fieldState.invalid}
                aria-describedby={describedBy}
                className={cn(
                  inputClass,
                  prefix && "ps-10",
                  suffix && "pe-10",
                  className,
                )}
              />
              {suffix ? (
                <span
                  aria-hidden
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm"
                >
                  {suffix}
                </span>
              ) : null}
            </div>
            {hint ? (
              <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
            ) : null}
            <FieldError id={`${id}-error`} errors={[fieldState.error]} />
            {end}
          </Field>
        );
      }}
    />
  );
}

/** "2.50%" or "Rs 15.00", as the shop default is shown. */
function shopDefaultText(
  t: CommoditiesTranslator,
  formatRs: (value: string) => string,
  field: ChargeField,
  value: string,
): string {
  return field === "labourPerBag" ? formatRs(value) : t("percent", { value });
}

/**
 * One charge override. Empty = the shop default, which is shown as the
 * placeholder and hint; "Use shop default" empties a set override (sent as
 * `null`, so the server clears it).
 */
function ChargeInput({
  control,
  setValue,
  setFocus,
  name,
  shopCharges,
}: {
  control: Control<CommodityFormValues>;
  setValue: UseFormSetValue<CommodityFormValues>;
  setFocus: UseFormSetFocus<CommodityFormValues>;
  name: ChargeField;
  shopCharges: EffectiveCharges | undefined;
}) {
  const t = useTranslations("commodities");
  const { formatRs } = useFormat();
  const value = useWatch({ control, name });
  const fallback = shopCharges?.[name];
  const label = t(`form.charges.${name}`);
  const money = name === "labourPerBag";
  return (
    <TextField
      control={control}
      name={name}
      label={label}
      optional
      hint={
        fallback
          ? t("form.shopDefault", {
              value: shopDefaultText(t, formatRs, name, fallback),
            })
          : t("form.shopDefaultUnknown")
      }
      inputMode="decimal"
      dir="ltr"
      autoComplete="off"
      placeholder={fallback}
      prefix={money ? t("form.currency") : undefined}
      suffix={money ? undefined : "%"}
      end={
        value.trim() !== "" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary h-8 w-fit gap-1.5 px-2"
            aria-label={t("form.useDefaultFor", { label })}
            onClick={() => {
              setValue(name, "", {
                shouldDirty: true,
                shouldValidate: true,
              });
              // The button goes away: keep the keyboard on the field.
              setFocus(name);
            }}
          >
            <X aria-hidden />
            {t("form.useDefault")}
          </Button>
        ) : null
      }
    />
  );
}

function UnitField({ control }: { control: Control<CommodityFormValues> }) {
  const t = useTranslations("commodities");
  const id = "commodity-defaultUnit";
  return (
    <Controller
      name="defaultUnit"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="gap-2">
          <FieldLabel id={`${id}-label`} htmlFor={id}>
            {t("form.defaultUnit")}
          </FieldLabel>
          <Select
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
          >
            <SelectTrigger
              id={id}
              ref={field.ref}
              onBlur={field.onBlur}
              aria-labelledby={`${id}-label`}
              aria-describedby={`${id}-hint`}
              aria-invalid={fieldState.invalid}
              className="rounded-field bg-card w-full data-[size=default]:h-11"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {t(`units.${unit}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription id={`${id}-hint`}>
            {t("form.defaultUnitHint")}
          </FieldDescription>
          <FieldError id={`${id}-error`} errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function ActiveField({ control }: { control: Control<CommodityFormValues> }) {
  const t = useTranslations("commodities");
  return (
    <Controller
      name="isActive"
      control={control}
      render={({ field }) => (
        <Field orientation="horizontal" className="gap-3">
          <Checkbox
            id="commodity-isActive"
            ref={field.ref}
            name={field.name}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            onBlur={field.onBlur}
            aria-describedby="commodity-isActive-hint"
          />
          <FieldContent className="gap-0.5">
            <FieldLabel htmlFor="commodity-isActive">
              {t("form.isActive")}
            </FieldLabel>
            <FieldDescription id="commodity-isActive-hint">
              {t("form.isActiveHint")}
            </FieldDescription>
          </FieldContent>
        </Field>
      )}
    />
  );
}
