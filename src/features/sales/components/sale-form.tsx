"use client";

import { bidi } from "@/i18n/bidi";
import { useTranslations } from "next-intl";
import type { Translator } from "@/i18n/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { Plus, TriangleAlert } from "lucide-react";
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
import {
  inputClass,
  itemCellId,
  ItemRow,
} from "@/features/purchases/components/item-row";
import {
  useSaveShortcuts,
  walkItemsOnEnter,
} from "@/features/purchases/components/keyboard";
import {
  FormErrorAlert,
  placeServerErrors,
  SaveButtons,
  type SaveIntent,
} from "@/features/purchases/components/parchi-form";
import { isBlankItem } from "@/features/purchases/schemas";
import { savedItemCharges, savedRates } from "@/features/purchases/totals";
import { useTodayRates } from "@/features/rates/hooks";
import { readBalance } from "@/features/traders/balance";
import { TraderCombobox } from "@/features/traders/components/trader-combobox";
import { useTrader } from "@/features/traders/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { type ApiError, toApiError } from "@/lib/api-error";
import { useCan } from "@/lib/can";
import { useFormat } from "@/lib/use-format";
import { newIdempotencyKey } from "@/lib/idempotency";
import { saleRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useCreateSale, useUpdateSale } from "../hooks";
import {
  emptySaleItem,
  emptySaleValues,
  type SaleFormValues,
  saleFormSchema,
  toSaleFormField,
  toSaleFormValues,
  toSaleInput,
} from "../schemas";
import { creditWarning, liveSaleTotals } from "../totals";
import {
  CREDIT_LIMIT_EXCEEDED,
  type Sale,
  type SaleWithWarnings,
} from "../types";
import { SaleBreakdownLines } from "./sale-breakdown";

/** Labels, hints and buttons shared with the purchase form. */
const ID_PREFIX = "sale";
const BUYER_ID = "sale-buyer";
const BALANCE_ID = "sale-buyer-balance";
const itemId = (index: number, field: string) =>
  itemCellId(ID_PREFIX, index, field);

/** Message for an error that no form field shows. */
function generalMessage(t: Translator<"sales">, error: ApiError): string {
  if (error.status === 0) return t("errors.network");
  if (error.code === "DAY_CLOSED") return t("errors.dayClosed");
  if (error.code === "SALE_CANCELLED") return t("errors.cancelled");
  if (error.status === 403) return t("errors.forbidden");
  return error.message ?? t("errors.generic");
}

/** The server saved over the limit (shop setting "warn"): say so. */
function showWarnings(t: Translator<"sales">, sale: SaleWithWarnings) {
  for (const warning of sale.warnings ?? []) {
    if (warning.code === CREDIT_LIMIT_EXCEEDED) {
      toast.warning(t("credit.savedOver"), {
        description: warning.message,
      });
    }
  }
}

export interface SaleFormProps {
  /** Today in Asia/Karachi (the latest date allowed). */
  today: string;
  /** The saved sale to edit; leave out for a new one. */
  sale?: Sale;
}

/**
 * Sale entry, the twin of the purchase form: beopari (with their current
 * balance and credit limit), date and notes, then one row per commodity
 * and a live total from the server's calculator (net = gross + charges).
 * Enter moves on, Enter on the last rate adds an item, Ctrl+S saves,
 * Ctrl+P saves and prints. A sale that would take the beopari over their
 * credit limit shows a warning before it is saved.
 *
 * Every save of a new sale carries the form's Idempotency-Key, kept until
 * the save succeeds, so a retry never makes a second sale.
 */
export function SaleForm({ today, sale }: SaleFormProps) {
  const tp = useTranslations("purchases");
  const t = useTranslations("sales");
  const router = useRouter();
  const editing = Boolean(sale);
  const canSeeRates = useCan("rate.view");
  const todayRates = useTodayRates(canSeeRates);
  const create = useCreateSale();
  const update = useUpdateSale();

  // One key per bill; a retry of the same bill sends it again.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const inFlight = useRef(false);
  const pendingFocus = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const schema = useMemo(() => saleFormSchema(today, t, tp), [today, t, tp]);
  const defaultValues = useMemo(
    () =>
      sale
        ? toSaleFormValues(sale, savedItemCharges(sale.charges))
        : emptySaleValues(today),
    [sale, today],
  );
  // An edit keeps the bill's own charge rates, as the server does.
  const manual = useMemo(() => (sale ? savedRates(sale.charges) : {}), [sale]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const items = useWatch({ control: form.control, name: "items" });
  const buyer = useWatch({ control: form.control, name: "buyer" });
  const live = useMemo(
    () => liveSaleTotals(t, items, manual),
    [t, items, manual],
  );
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
    append(emptySaleItem(last?.weightUnit), { shouldFocus: false });
  };

  const save = async (values: SaleFormValues, intent: SaveIntent) => {
    setFormError(null);
    const { input, rowIndexes } = toSaleInput(values);
    try {
      let saved: SaleWithWarnings;
      if (sale) {
        saved = await update.mutateAsync({
          id: sale.id,
          input,
          oldBuyerId: sale.buyer.id,
        });
        toast.success(t("form.updated", { billNo: saved.billNo }));
      } else {
        ({ sale: saved } = await create.mutateAsync({ input, idempotencyKey }));
        toast.success(t("form.saved", { billNo: saved.billNo }));
      }
      showWarnings(t, saved);

      if (intent === "new") {
        // A new bill gets a new key; the date stays for the next bill.
        setIdempotencyKey(newIdempotencyKey());
        form.reset(emptySaleValues(values.saleDate));
        document.getElementById(BUYER_ID)?.focus();
        return;
      }
      setLeaving(true);
      router.push(
        intent === "print"
          ? saleRoutes.print(saved.id)
          : saleRoutes.detail(saved.id),
      );
    } catch (error) {
      // A blocked credit limit (409) comes with a field error on the
      // beopari: nothing was saved, so the form keeps its data and key.
      const e = toApiError(error);
      const { placed, unplaced } = placeServerErrors(
        e.errors,
        (field) => toSaleFormField(field, rowIndexes),
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

  // A new bill starts on the beopari (the date is already today).
  useEffect(() => {
    if (!editing) document.getElementById(BUYER_ID)?.focus();
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

  // What the sale being edited already put in this beopari's khata.
  const alreadyInBalance =
    sale && sale.status === "posted" && buyer?.id === sale.buyer.id
      ? subtract(sale.netAmount, sale.receivedAmount)
      : "0";

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
          <FormErrorAlert message={formError} testId="sale-form-error" />
        ) : null}

        <section
          aria-labelledby="sale-header-title"
          className="rounded-card bg-card flex flex-col gap-4 border p-4 sm:p-5"
        >
          <h2 id="sale-header-title" className="font-heading text-lg font-bold">
            {tp("form.header")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <Field data-invalid={Boolean(errors.saleDate) || undefined}>
              <FieldLabel htmlFor="sale-date">{tp("form.date")}</FieldLabel>
              <Input
                id="sale-date"
                type="date"
                dir="ltr"
                max={today}
                aria-invalid={Boolean(errors.saleDate) || undefined}
                className={inputClass}
                {...form.register("saleDate")}
              />
              <FieldError errors={[errors.saleDate]} />
            </Field>
            <Controller
              control={form.control}
              name="buyer"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor={BUYER_ID}>{t("form.buyer")}</FieldLabel>
                  <TraderCombobox
                    id={BUYER_ID}
                    type="beopari"
                    value={field.value}
                    onChange={(trader) => {
                      field.onChange(trader);
                      field.onBlur();
                    }}
                    placeholder={t("form.buyerPlaceholder")}
                    aria-describedby={field.value ? BALANCE_ID : undefined}
                    aria-invalid={fieldState.invalid}
                  />
                  {field.value ? (
                    <BuyerBalance id={BALANCE_ID} buyerId={field.value.id} />
                  ) : null}
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <Field data-invalid={Boolean(errors.notes) || undefined}>
            <FieldLabel htmlFor="sale-notes">{tp("form.notes")}</FieldLabel>
            <Textarea
              id="sale-notes"
              rows={1}
              dir="auto"
              placeholder={tp("form.notesPlaceholder")}
              aria-invalid={Boolean(errors.notes) || undefined}
              className="rounded-field bg-card min-h-11"
              {...form.register("notes")}
            />
            <FieldError errors={[errors.notes]} />
          </Field>
        </section>

        <section
          aria-labelledby="sale-items-title"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="sale-items-title"
              className="font-heading text-lg font-bold"
            >
              {tp("form.items")}
            </h2>
            <p className="text-muted-foreground text-xs">
              {tp("form.keyboardHint")}
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
            {tp("form.addItem")}
          </Button>
        </section>
      </div>

      <aside
        aria-labelledby="sale-total-title"
        className="rounded-card bg-card flex flex-col gap-4 border p-4 sm:p-5 lg:sticky lg:top-20"
      >
        <h2 id="sale-total-title" className="font-heading text-lg font-bold">
          {t("breakdown.title")}
        </h2>
        <div aria-live="polite">
          {live.totals ? (
            <SaleBreakdownLines values={live.totals} />
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
        {buyer && live.totals ? (
          <CreditLimitWarning
            buyerId={buyer.id}
            buyerName={buyer.name}
            netAmount={live.totals.netAmount}
            receivedAmount={sale?.receivedAmount ?? "0"}
            alreadyInBalance={alreadyInBalance}
          />
        ) : null}
        <SaveButtons
          busy={busy}
          showNew={!editing}
          onSubmit={(intent) => void submit(intent)}
        />
      </aside>
    </form>
  );
}

/** `a − b` for two rupee strings. */
function subtract(a: string, b: string): string {
  return new Decimal(a).minus(b).toFixed(2);
}

const balanceTone = {
  receivable: "text-foreground",
  payable: "text-success",
  settled: "text-muted-foreground",
} as const;

/**
 * Next to the beopari: their khata balance now and their credit limit
 * (`GET /traders/:id`, which every role may read).
 */
function BuyerBalance({ id, buyerId }: { id: string; buyerId: string }) {
  const { formatRs } = useFormat();
  const t = useTranslations("sales");
  const trader = useTrader(buyerId);

  if (trader.isPending) {
    return (
      <p id={id} className="text-muted-foreground text-xs">
        {t("buyer.loading")}
      </p>
    );
  }
  if (trader.isError) {
    return (
      <p id={id} className="text-muted-foreground text-xs">
        {t("buyer.error")}
      </p>
    );
  }
  const { kind, amount } = readBalance(trader.data.balance);
  const limit = trader.data.creditLimit;
  return (
    <p
      id={id}
      data-testid="sale-buyer-balance"
      className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-xs"
    >
      <span>
        {t("buyer.balance")}:{" "}
        <span
          dir="auto"
          data-testid="sale-buyer-balance-amount"
          className={cn("font-semibold tabular-nums", balanceTone[kind])}
        >
          {formatRs(amount)}
        </span>{" "}
        {t(`buyer.${kind}`)}
      </span>{" "}
      <span>
        {t("buyer.creditLimit")}:{" "}
        <span
          dir="auto"
          data-testid="sale-buyer-credit-limit"
          className="text-foreground font-semibold tabular-nums"
        >
          {limit === null ? t("buyer.noLimit") : formatRs(limit)}
        </span>
      </span>
    </p>
  );
}

/**
 * Shown before saving when this sale would take the beopari above their
 * credit limit (balance + this sale's net, by the server's rule).
 */
function CreditLimitWarning({
  buyerId,
  buyerName,
  netAmount,
  receivedAmount,
  alreadyInBalance,
}: {
  buyerId: string;
  buyerName: string;
  netAmount: string;
  receivedAmount: string;
  alreadyInBalance: string;
}) {
  const { formatRs } = useFormat();
  const t = useTranslations("sales");
  const trader = useTrader(buyerId);
  if (!trader.data) return null;
  const warning = creditWarning({
    balance: trader.data.balance,
    creditLimit: trader.data.creditLimit,
    netAmount,
    receivedAmount,
    alreadyInBalance,
  });
  if (!warning) return null;
  return (
    <div
      role="alert"
      data-testid="sale-credit-warning"
      className="border-warning/40 bg-warning-soft text-warning flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px]"
    >
      <TriangleAlert aria-hidden className="mt-px size-4 flex-none" />
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">{t("credit.title")}</p>
        <p>
          <bdi dir="auto">
            {t("credit.body", {
              name: bidi(buyerName),
              owed: formatRs(warning.owed),
              limit: formatRs(warning.creditLimit),
            })}
          </bdi>
        </p>
      </div>
    </div>
  );
}
