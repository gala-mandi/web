"use client";

import { useTranslations } from "next-intl";
import type { Translator } from "@/i18n/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTodayRates } from "@/features/rates/hooks";
import { TraderCombobox } from "@/features/traders/components/trader-combobox";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { type ApiError, toApiError } from "@/lib/api-error";
import { useCan } from "@/lib/can";
import { newIdempotencyKey } from "@/lib/idempotency";
import { purchaseRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useCreatePurchase, useUpdatePurchase } from "../hooks";
import {
  emptyItem,
  emptyPurchaseValues,
  isBlankItem,
  type PurchaseFormValues,
  purchaseFormSchema,
  toFormField,
  toPurchaseFormValues,
  toPurchaseInput,
} from "../schemas";
import { liveTotals, savedItemCharges, savedRates } from "../totals";
import type { Purchase } from "../types";
import { BreakdownLines } from "./breakdown-lines";
import { inputClass, itemCellId, ItemRow } from "./item-row";
import { useSaveShortcuts, walkItemsOnEnter } from "./keyboard";
import {
  FormErrorAlert,
  placeServerErrors,
  SaveButtons,
  type SaveIntent,
} from "./parchi-form";

const ID_PREFIX = "purchase";
const TRADER_ID = "purchase-trader";
const itemId = (index: number, field: string) =>
  itemCellId(ID_PREFIX, index, field);

/** Message for an error that no form field shows. */
function generalMessage(t: Translator<"purchases">, error: ApiError): string {
  if (error.status === 0) return t("errors.network");
  if (error.code === "DAY_CLOSED") return t("errors.dayClosed");
  if (error.code === "PURCHASE_CANCELLED") return t("errors.cancelled");
  if (error.status === 403) return t("errors.forbidden");
  return error.message ?? t("errors.generic");
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
  const t = useTranslations("purchases");
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

  const schema = useMemo(() => purchaseFormSchema(today, t), [today, t]);
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
  const live = useMemo(() => liveTotals(t, items, manual), [t, items, manual]);
  const { isDirty, errors } = form.formState;
  const busy =
    form.formState.isSubmitting || create.isPending || update.isPending;

  useUnsavedChangesWarning(isDirty && !leaving, t("form.leaveWarning"));

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
        toast.success(t("form.updated", { billNo: saved.billNo }));
      } else {
        ({ purchase: saved } = await create.mutateAsync({
          input,
          idempotencyKey,
        }));
        toast.success(t("form.saved", { billNo: saved.billNo }));
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
      const { placed, unplaced } = placeServerErrors(
        e.errors,
        (field) => toFormField(field, rowIndexes),
        form.setError,
        t("errors.generic"),
      );
      if (placed > 0 && unplaced.length === 0) return;
      const message = unplaced.length
        ? unplaced.join(" ")
        : generalMessage(t, e);
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

  // A new bill starts on the kissan (the date is already today).
  useEffect(() => {
    if (!editing) document.getElementById(TRADER_ID)?.focus();
  }, [editing]);

  // Ctrl+S saves, Ctrl+P saves and prints (instead of printing the form).
  useSaveShortcuts((intent) => void submit(intent));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit("save");
  };

  /** Enter walks commodity → bags → weight → rate → next item. */
  const onItemsKeyDown = (event: KeyboardEvent<HTMLDivElement>) =>
    walkItemsOnEnter(event, ID_PREFIX, () => {
      const last = items.at(-1);
      if (last && !isBlankItem(last) && fields.length < 100) addItem();
      else
        formRef.current
          ?.querySelector<HTMLButtonElement>("button[type=submit]")
          ?.focus();
    });

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
          <FormErrorAlert message={formError} testId="purchase-form-error" />
        ) : null}

        <section
          aria-labelledby="purchase-header-title"
          className="rounded-card bg-card flex flex-col gap-4 border p-4 sm:p-5"
        >
          <h2
            id="purchase-header-title"
            className="font-heading text-lg font-bold"
          >
            {t("form.header")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <Field data-invalid={Boolean(errors.purchaseDate) || undefined}>
              <FieldLabel htmlFor="purchase-date">{t("form.date")}</FieldLabel>
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
                  <FieldLabel htmlFor={TRADER_ID}>
                    {t("form.trader")}
                  </FieldLabel>
                  <TraderCombobox
                    id={TRADER_ID}
                    type="kissan"
                    value={field.value}
                    onChange={(trader) => {
                      field.onChange(trader);
                      field.onBlur();
                    }}
                    placeholder={t("form.traderPlaceholder")}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <Field data-invalid={Boolean(errors.notes) || undefined}>
            <FieldLabel htmlFor="purchase-notes">{t("form.notes")}</FieldLabel>
            <Textarea
              id="purchase-notes"
              rows={1}
              dir="auto"
              placeholder={t("form.notesPlaceholder")}
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
              {t("form.items")}
            </h2>
            <p className="text-muted-foreground text-xs">
              {t("form.keyboardHint")}
            </p>
          </div>
          <div onKeyDown={onItemsKeyDown} className="flex flex-col gap-3">
            {fields.map((row, index) => (
              <ItemRow
                key={row.id}
                idPrefix={ID_PREFIX}
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
            {t("form.addItem")}
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
          {t("breakdown.title")}
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
              {live.error ?? t("breakdown.empty")}
            </p>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {t("breakdown.preview")}
        </p>
        <SaveButtons
          busy={busy}
          showNew={!editing}
          onSubmit={(intent) => void submit(intent)}
        />
      </aside>
    </form>
  );
}
