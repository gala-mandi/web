"use client";

import { useTranslations } from "next-intl";
import { unitWords } from "@/lib/format";
import { useFormat } from "@/lib/use-format";
import { useReadOnly } from "@/features/subscription/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { type Control, Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/features/staff/form-errors";
import { toApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useUpdateSettings } from "../hooks";
import {
  languages,
  sampleBillNumber,
  settingsFields,
  type SettingsField,
  settingsSchema,
  type SettingsValues,
  toFormValues,
  toUpdateInput,
  units,
} from "../schemas";
import type { Settings } from "../types";
import { LogoUpload } from "./logo-upload";
import { ParchiPreview } from "./parchi-preview";

const inputClass = "rounded-field h-11 bg-card";

/** One form for every section; "Save changes" sends only what changed. */
export function SettingsForm({ settings }: { settings: Settings }) {
  const format = useFormat();
  const t = useTranslations("settings");
  const [formError, setFormError] = useState<string | null>(null);
  const update = useUpdateSettings();
  const inFlight = useRef(false);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema(t)),
    defaultValues: toFormValues(settings),
  });
  const values = useWatch({ control: form.control });
  const { isDirty, isSubmitting } = form.formState;
  const busy = isSubmitting || update.isPending;
  // Read-only shop: settings can be viewed, not saved (the server refuses).
  const readOnly = useReadOnly();

  const submit = async (data: SettingsValues) => {
    setFormError(null);
    const input = toUpdateInput(data, form.formState.dirtyFields);
    if (Object.keys(input).length === 0) {
      toast.info(t("nothingChanged"));
      return;
    }
    try {
      const saved = await update.mutateAsync(input);
      // Keep values the server normalised (e.g. "2.5" → "2.50").
      form.reset(toFormValues(saved));
      toast.success(t("saved"));
    } catch (error) {
      const e = toApiError(error);
      if (
        !applyServerErrors(e, form.setError, settingsFields, {
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
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  const { formatMaund } = format;
  const maundExample = formatMaund("1000", values.maundKg ?? "");

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        method="post"
        noValidate
        onSubmit={onSubmit}
        aria-busy={busy || undefined}
        className="flex flex-col gap-6"
      >
        {formError ? (
          <div
            role="alert"
            className="bg-destructive-soft border-destructive-border text-destructive flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
          >
            <AlertCircle aria-hidden className="mt-px size-4 flex-none" />
            {formError}
          </div>
        ) : null}

        <Section
          id="profile"
          title={t("sections.profile.title")}
          description={t("sections.profile.description")}
        >
          <LogoUpload name={settings.name} logoUrl={settings.logoUrl} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="name"
              label={t("fields.name")}
              autoComplete="organization"
            />
            <TextField
              control={form.control}
              name="phone"
              label={t("fields.phone")}
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder={t("fields.phonePlaceholder")}
            />
            <TextField
              control={form.control}
              name="email"
              label={t("fields.email")}
              type="email"
              dir="ltr"
              placeholder={t("fields.emailPlaceholder")}
            />
            <TextField
              control={form.control}
              name="city"
              label={t("fields.city")}
            />
          </div>
          <TextField
            control={form.control}
            name="address"
            label={t("fields.address")}
            multiline
          />
        </Section>

        <Section
          id="parchi"
          title={t("sections.parchi.title")}
          description={t("sections.parchi.description")}
        >
          <TextField
            control={form.control}
            name="displayName"
            label={t("fields.displayName")}
            hint={t("fields.displayNameHint")}
            placeholder={values.name}
          />
          <TextField
            control={form.control}
            name="parchiFooter"
            label={t("fields.parchiFooter")}
            hint={t("fields.parchiFooterHint")}
            multiline
          />
        </Section>

        <Section
          id="charges"
          title={t("sections.charges.title")}
          description={t("sections.charges.description")}
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              control={form.control}
              name="defaultCommissionPct"
              label={t("fields.defaultCommissionPct")}
              hint={t("fields.defaultCommissionPctHint")}
              inputMode="decimal"
              dir="ltr"
              suffix="%"
            />
            <TextField
              control={form.control}
              name="marketFeePct"
              label={t("fields.marketFeePct")}
              hint={t("fields.marketFeePctHint")}
              inputMode="decimal"
              dir="ltr"
              suffix="%"
            />
            <TextField
              control={form.control}
              name="labourPerBag"
              label={t("fields.labourPerBag")}
              hint={t("fields.labourPerBagHint")}
              inputMode="decimal"
              dir="ltr"
              prefix={unitWords[format.locale].rs}
            />
          </div>
        </Section>

        <Section
          id="units"
          title={t("sections.units.title")}
          description={t("sections.units.description")}
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <SelectField
              control={form.control}
              name="defaultUnit"
              label={t("fields.defaultUnit")}
              options={units.map((u) => ({ value: u, label: t(`units.${u}`) }))}
            />
            <TextField
              control={form.control}
              name="maundKg"
              label={t("fields.maundKg")}
              hint={
                maundExample
                  ? t("fields.maundKgHint", { example: maundExample })
                  : undefined
              }
              inputMode="decimal"
              dir="ltr"
              suffix={unitWords[format.locale].kg}
            />
            <SelectField
              control={form.control}
              name="language"
              label={t("fields.language")}
              hint={t("fields.languageHint")}
              options={languages.map((l) => ({
                value: l,
                label: t(`languages.${l}`),
                lang: l,
              }))}
            />
          </div>
        </Section>

        <Section
          id="numbering"
          title={t("sections.numbering.title")}
          description={t("sections.numbering.description")}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="billPrefix"
              label={t("fields.billPrefix")}
              hint={t("fields.billPrefixHint", {
                example: sampleBillNumber(values.billPrefix ?? ""),
              })}
              dir="ltr"
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="financialYearStart"
              label={t("fields.financialYearStart")}
              type="date"
              dir="ltr"
            />
          </div>
        </Section>

        <div className="bg-background/95 sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t px-1 py-3 backdrop-blur">
          {isDirty ? (
            <span
              className="text-muted-foreground me-auto text-sm"
              role="status"
            >
              {t("unsaved")}
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
            {t("discard")}
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || busy || readOnly}
            className="gap-2 font-semibold"
          >
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {busy ? t("saving") : t("save")}
          </Button>
        </div>
      </form>

      <div className="lg:sticky lg:top-4">
        <ParchiPreview
          logoUrl={settings.logoUrl}
          values={{
            name: values.name ?? "",
            displayName: values.displayName ?? "",
            address: values.address ?? "",
            city: values.city ?? "",
            phone: values.phone ?? "",
            billPrefix: values.billPrefix ?? "",
            parchiFooter: values.parchiFooter ?? "",
          }}
        />
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-card bg-card flex flex-col gap-5 border p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="font-heading text-lg font-bold">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

type InputProps = Omit<
  React.ComponentProps<"input">,
  "name" | "prefix" | "children"
>;

function TextField({
  control,
  name,
  label,
  hint,
  multiline,
  prefix,
  suffix,
  ...inputProps
}: {
  control: Control<SettingsValues>;
  name: SettingsField;
  label: string;
  hint?: string;
  multiline?: boolean;
  prefix?: string;
  suffix?: string;
} & InputProps) {
  const id = `settings-${name}`;
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
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {multiline ? (
              <Textarea
                {...common}
                rows={3}
                className="rounded-field bg-card"
              />
            ) : (
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
                  {...common}
                  className={cn(
                    inputClass,
                    prefix && "ps-10",
                    suffix && "pe-10",
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

function SelectField({
  control,
  name,
  label,
  hint,
  options,
}: {
  control: Control<SettingsValues>;
  name: "defaultUnit" | "language";
  label: string;
  hint?: string;
  options: { value: string; label: string; lang?: string }[];
}) {
  const id = `settings-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="gap-2">
          <FieldLabel id={`${id}-label`} htmlFor={id}>
            {label}
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
              aria-describedby={hint ? `${id}-hint` : undefined}
              aria-invalid={fieldState.invalid}
              className="rounded-field bg-card w-full data-[size=default]:h-11"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {options.map((o) => (
                <SelectItem
                  key={o.value}
                  value={o.value}
                  lang={o.lang}
                  className={o.lang === "ur" ? "font-urdu" : undefined}
                >
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hint ? (
            <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
          ) : null}
          <FieldError id={`${id}-error`} errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
