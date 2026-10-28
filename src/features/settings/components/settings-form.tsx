"use client";

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
import { formatMaund } from "@/lib/format";
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
import { languageText, settingsText, unitText } from "../text";
import type { Settings } from "../types";
import { LogoUpload } from "./logo-upload";
import { ParchiPreview } from "./parchi-preview";

const t = settingsText;
const f = settingsText.fields;
const inputClass = "rounded-field h-11 bg-card";

/** One form for every section; "Save changes" sends only what changed. */
export function SettingsForm({ settings }: { settings: Settings }) {
  const [formError, setFormError] = useState<string | null>(null);
  const update = useUpdateSettings();
  const inFlight = useRef(false);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: toFormValues(settings),
  });
  const values = useWatch({ control: form.control });
  const { isDirty, isSubmitting } = form.formState;
  const busy = isSubmitting || update.isPending;

  const submit = async (data: SettingsValues) => {
    setFormError(null);
    const input = toUpdateInput(data, form.formState.dirtyFields);
    if (Object.keys(input).length === 0) {
      toast.info(t.nothingChanged);
      return;
    }
    try {
      const saved = await update.mutateAsync(input);
      // Keep values the server normalised (e.g. "2.5" → "2.50").
      form.reset(toFormValues(saved));
      toast.success(t.saved);
    } catch (error) {
      const e = toApiError(error);
      if (!applyServerErrors(e, form.setError, settingsFields)) {
        setFormError(
          e.status === 0 ? t.errors.network : (e.message ?? t.errors.generic),
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

        <Section id="profile" {...t.sections.profile}>
          <LogoUpload name={settings.name} logoUrl={settings.logoUrl} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="name"
              label={f.name}
              autoComplete="organization"
            />
            <TextField
              control={form.control}
              name="phone"
              label={f.phone}
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder={f.phonePlaceholder}
            />
            <TextField
              control={form.control}
              name="email"
              label={f.email}
              type="email"
              dir="ltr"
              placeholder={f.emailPlaceholder}
            />
            <TextField control={form.control} name="city" label={f.city} />
          </div>
          <TextField
            control={form.control}
            name="address"
            label={f.address}
            multiline
          />
        </Section>

        <Section id="parchi" {...t.sections.parchi}>
          <TextField
            control={form.control}
            name="displayName"
            label={f.displayName}
            hint={f.displayNameHint}
            placeholder={values.name}
          />
          <TextField
            control={form.control}
            name="parchiFooter"
            label={f.parchiFooter}
            hint={f.parchiFooterHint}
            multiline
          />
        </Section>

        <Section id="charges" {...t.sections.charges}>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              control={form.control}
              name="defaultCommissionPct"
              label={f.defaultCommissionPct}
              hint={f.defaultCommissionPctHint}
              inputMode="decimal"
              dir="ltr"
              suffix="%"
            />
            <TextField
              control={form.control}
              name="marketFeePct"
              label={f.marketFeePct}
              hint={f.marketFeePctHint}
              inputMode="decimal"
              dir="ltr"
              suffix="%"
            />
            <TextField
              control={form.control}
              name="labourPerBag"
              label={f.labourPerBag}
              hint={f.labourPerBagHint}
              inputMode="decimal"
              dir="ltr"
              prefix="Rs"
            />
          </div>
        </Section>

        <Section id="units" {...t.sections.units}>
          <div className="grid gap-5 sm:grid-cols-3">
            <SelectField
              control={form.control}
              name="defaultUnit"
              label={f.defaultUnit}
              options={units.map((u) => ({ value: u, label: unitText[u] }))}
            />
            <TextField
              control={form.control}
              name="maundKg"
              label={f.maundKg}
              hint={maundExample ? f.maundKgHint(maundExample) : undefined}
              inputMode="decimal"
              dir="ltr"
              suffix="kg"
            />
            <SelectField
              control={form.control}
              name="language"
              label={f.language}
              options={languages.map((l) => ({
                value: l,
                label: languageText[l],
              }))}
            />
          </div>
        </Section>

        <Section id="numbering" {...t.sections.numbering}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="billPrefix"
              label={f.billPrefix}
              hint={f.billPrefixHint(sampleBillNumber(values.billPrefix ?? ""))}
              dir="ltr"
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="financialYearStart"
              label={f.financialYearStart}
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
            type="submit"
            disabled={!isDirty || busy}
            className="gap-2 font-semibold"
          >
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {busy ? t.saving : t.save}
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
  options,
}: {
  control: Control<SettingsValues>;
  name: "defaultUnit" | "language";
  label: string;
  options: { value: string; label: string }[];
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
              aria-invalid={fieldState.invalid}
              className="rounded-field bg-card w-full data-[size=default]:h-11"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={`${id}-error`} errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
