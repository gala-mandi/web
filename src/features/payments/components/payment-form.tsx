"use client";

import { useLocale, useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, ReceiptText, TriangleAlert, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Controller, type Resolver, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { inputClass } from "@/features/purchases/components/item-row";
import { useSaveShortcuts } from "@/features/purchases/components/keyboard";
import {
  FormErrorAlert,
  placeServerErrors,
  SaveButtons,
  type SaveIntent,
} from "@/features/purchases/components/parchi-form";
import { readBalance } from "@/features/traders/balance";
import { TraderCombobox } from "@/features/traders/components/trader-combobox";
import { useTrader } from "@/features/traders/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { type ApiError, toApiError } from "@/lib/api-error";
import { useFormat } from "@/lib/use-format";
import { newIdempotencyKey } from "@/lib/idempotency";
import { paymentRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { allocationTotals, type OutstandingBill } from "../allocation";
import { useCreatePayment, useOutstandingBills } from "../hooks";
import {
  emptyPaymentValues,
  type PaymentFormValues,
  paymentFormSchema,
  sharesOf,
  toPaymentFormField,
  type PaymentsTranslator,
  toPaymentInput,
} from "../schemas";
import {
  OVERPAYMENT,
  type PaymentDirection,
  paymentMethods,
  type PaymentWithWarnings,
} from "../types";
import { AllocationTable } from "./allocation-table";

const TRADER_ID = "payment-trader";
const BALANCE_ID = "payment-trader-balance";
const NO_BILLS: readonly OutstandingBill[] = [];

/** Message for an error that no form field shows. */
function generalMessage(t: PaymentsTranslator, error: ApiError): string {
  if (error.status === 0) return t("errors.network");
  if (error.status === 403) return t("errors.forbidden");
  return error.message ?? t("errors.generic");
}

/** Saved above what the khata owed (shop setting "advance"): say so. */
function showWarnings(t: PaymentsTranslator, payment: PaymentWithWarnings) {
  for (const warning of payment.warnings ?? []) {
    if (warning.code === OVERPAYMENT) {
      toast.warning(t("overpayment.saved"), {
        description: warning.message,
      });
    }
  }
}

export interface PaymentFormProps {
  /** paid: to a kissan, settling purchases; received: from a beopari, sales. */
  direction: PaymentDirection;
  /** Today in Asia/Karachi (the latest date allowed). */
  today: string;
}

/**
 * A payment to a kissan or a receipt from a beopari: date, trader (with
 * the khata balance), amount, method and reference, then the trader's
 * outstanding bills, oldest first. The amount is split over them oldest
 * first as it is typed; typing in a bill's row overrides the split. What
 * no bill takes is an advance (peshgi). Ctrl+S saves, Ctrl+P saves and
 * prints the voucher.
 *
 * Every save carries the form's Idempotency-Key, kept until the save
 * succeeds, so a retry never makes a second voucher.
 */
export function PaymentForm({ direction, today }: PaymentFormProps) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const router = useRouter();
  const create = useCreatePayment();
  const methodLabelId = useId();

  // One key per voucher; a retry of the same voucher sends it again.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const inFlight = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // The schema checks typed shares against the bills on screen; the
  // resolver reads them when it runs, not when the form is made.
  const billsRef = useRef<readonly OutstandingBill[]>(NO_BILLS);
  const resolver: Resolver<PaymentFormValues> = (values, context, options) =>
    zodResolver(
      paymentFormSchema(today, direction, billsRef.current, t, locale),
    )(values, context, options);

  const form = useForm<PaymentFormValues>({
    resolver,
    defaultValues: emptyPaymentValues(today),
    mode: "onTouched",
  });
  const trader = useWatch({ control: form.control, name: "trader" });
  const amount = useWatch({ control: form.control, name: "amount" });
  const manual = useWatch({ control: form.control, name: "manual" });
  const method = useWatch({ control: form.control, name: "method" });

  const billsQuery = useOutstandingBills(direction, trader?.id ?? null);
  const bills = billsQuery.data?.bills ?? NO_BILLS;
  useEffect(() => {
    billsRef.current = bills;
  }, [bills]);

  const shares = sharesOf({ amount, manual }, bills);
  const totals = allocationTotals(amount, shares);
  const { isDirty, isSubmitted, errors } = form.formState;
  const busy = form.formState.isSubmitting || create.isPending;

  useUnsavedChangesWarning(isDirty && !leaving, t("form.leaveWarning"));

  const setManual = (next: Record<string, string> | null) =>
    form.setValue("manual", next, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });

  /** The first typed share starts from the split on screen. */
  const onShareChange = (billId: string, value: string) => {
    const start =
      manual ??
      Object.fromEntries(bills.map((bill, i) => [bill.id, shares[i]]));
    setManual({ ...start, [billId]: value });
  };

  const save = async (values: PaymentFormValues, intent: SaveIntent) => {
    setFormError(null);
    // Auto-allocation needs the bills: never save a split it couldn't see.
    if (values.trader && !billsQuery.isSuccess) {
      const message = t("bills.error");
      setFormError(message);
      toast.error(message);
      return;
    }
    const { input, billIds } = toPaymentInput(values, direction, bills);
    try {
      const { payment } = await create.mutateAsync({ input, idempotencyKey });
      toast.success(
        t("form.saved", { direction, voucherNo: payment.voucherNo }),
      );
      showWarnings(t, payment);

      if (intent === "new") {
        // A new voucher gets a new key; the date and method stay.
        setIdempotencyKey(newIdempotencyKey());
        form.reset({
          ...emptyPaymentValues(values.paymentDate),
          method: values.method,
        });
        document.getElementById(TRADER_ID)?.focus();
        return;
      }
      setLeaving(true);
      router.push(
        intent === "print"
          ? paymentRoutes.print(payment.id)
          : paymentRoutes.detail(payment.id),
      );
    } catch (error) {
      // A blocked over-payment (409) comes with a field error on the
      // amount: nothing was saved, so the form keeps its data and key.
      const e = toApiError(error);
      const { placed, unplaced } = placeServerErrors(
        e.errors,
        (field) => toPaymentFormField(field, billIds),
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

  // A new voucher starts on the trader (the date is already today).
  useEffect(() => {
    document.getElementById(TRADER_ID)?.focus();
  }, []);

  useSaveShortcuts((intent) => void submit(intent));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit("save");
  };

  const shareErrors = Object.fromEntries(
    Object.entries(errors.manual ?? {}).map(([id, error]) => [
      id,
      (error as { message?: string } | undefined)?.message,
    ]),
  );

  return (
    <form
      method="post"
      noValidate
      onSubmit={onSubmit}
      aria-busy={busy || undefined}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        {formError ? (
          <FormErrorAlert message={formError} testId="payment-form-error" />
        ) : null}

        <section
          aria-labelledby="payment-header-title"
          className="rounded-card bg-card flex flex-col gap-4 border p-4 sm:p-5"
        >
          <h2
            id="payment-header-title"
            className="font-heading text-lg font-bold"
          >
            {t("form.header")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <Field data-invalid={Boolean(errors.paymentDate) || undefined}>
              <FieldLabel htmlFor="payment-date">{t("form.date")}</FieldLabel>
              <Input
                id="payment-date"
                type="date"
                dir="ltr"
                max={today}
                aria-invalid={Boolean(errors.paymentDate) || undefined}
                className={inputClass}
                {...form.register("paymentDate")}
              />
              <FieldError errors={[errors.paymentDate]} />
            </Field>
            <Controller
              control={form.control}
              name="trader"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor={TRADER_ID}>
                    {t(`form.trader.${direction}`)}
                  </FieldLabel>
                  <TraderCombobox
                    id={TRADER_ID}
                    type={direction === "paid" ? "kissan" : "beopari"}
                    value={field.value}
                    onChange={(next) => {
                      field.onChange(next);
                      field.onBlur();
                      // Another trader has other bills: back to auto.
                      form.setValue("manual", null);
                    }}
                    placeholder={t(`form.traderPlaceholder.${direction}`)}
                    aria-describedby={field.value ? BALANCE_ID : undefined}
                    aria-invalid={fieldState.invalid}
                  />
                  {field.value ? (
                    <TraderBalance id={BALANCE_ID} traderId={field.value.id} />
                  ) : null}
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <Field data-invalid={Boolean(errors.amount) || undefined}>
              <FieldLabel htmlFor="payment-amount">
                {t("form.amount")}
              </FieldLabel>
              <div className="relative" dir="ltr">
                <span
                  aria-hidden
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 start-4 flex items-center text-sm font-semibold"
                >
                  Rs
                </span>
                <Input
                  id="payment-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={t("form.amountPlaceholder")}
                  aria-invalid={Boolean(errors.amount) || undefined}
                  className="rounded-field bg-card font-heading h-14 ps-12 text-2xl font-extrabold tabular-nums md:text-2xl"
                  {...form.register("amount")}
                />
              </div>
              <FieldError errors={[errors.amount]} />
            </Field>
            <Field>
              <FieldLabel id={methodLabelId} asChild>
                <span>
                  {direction === "paid"
                    ? t("form.method")
                    : t("form.methodReceived")}
                </span>
              </FieldLabel>
              <Controller
                control={form.control}
                name="method"
                render={({ field }) => (
                  <RadioGroup
                    aria-labelledby={methodLabelId}
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                  >
                    {paymentMethods.map((value) => (
                      <label
                        key={value}
                        className="rounded-field bg-card has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/[0.06] has-[:focus-visible]:ring-ring/50 flex h-14 cursor-pointer items-center justify-center gap-2 border px-2 text-sm font-semibold has-[:focus-visible]:ring-3"
                      >
                        <RadioGroupItem value={value} />
                        {t(`methods.${value}`)}
                      </label>
                    ))}
                  </RadioGroup>
                )}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.reference) || undefined}>
              <FieldLabel htmlFor="payment-reference">
                {t("form.reference")}
              </FieldLabel>
              <Input
                id="payment-reference"
                dir="auto"
                autoComplete="off"
                placeholder={t("form.referenceHint")}
                aria-invalid={Boolean(errors.reference) || undefined}
                className={inputClass}
                {...form.register("reference")}
              />
              <FieldError errors={[errors.reference]} />
            </Field>
            <Field data-invalid={Boolean(errors.notes) || undefined}>
              <FieldLabel htmlFor="payment-notes">{t("form.notes")}</FieldLabel>
              <Textarea
                id="payment-notes"
                rows={1}
                dir="auto"
                placeholder={t("form.notesPlaceholder")}
                aria-invalid={Boolean(errors.notes) || undefined}
                className="rounded-field bg-card min-h-11"
                {...form.register("notes")}
              />
              <FieldError errors={[errors.notes]} />
            </Field>
          </div>
        </section>

        <section
          aria-labelledby="payment-bills-title"
          className="rounded-card bg-card flex flex-col gap-4 border p-4 sm:p-5"
        >
          <div className="flex flex-col gap-0.5">
            <h2
              id="payment-bills-title"
              className="font-heading text-lg font-bold"
            >
              {t("bills.title")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t(`bills.description.${direction}`)}
            </p>
          </div>
          <BillsBody
            direction={direction}
            hasTrader={Boolean(trader)}
            query={billsQuery}
          >
            <AllocationTable
              bills={bills}
              amount={amount}
              shares={shares}
              manual={manual !== null}
              errors={shareErrors}
              onShareChange={onShareChange}
              onAuto={() => setManual(null)}
              onClear={() => setManual({})}
              more={billsQuery.data?.more}
            />
          </BillsBody>
        </section>
      </div>

      <aside
        aria-labelledby="payment-summary-title"
        className="rounded-card bg-card flex flex-col gap-4 border p-4 sm:p-5 lg:sticky lg:top-20"
      >
        <h2
          id="payment-summary-title"
          className="font-heading text-lg font-bold"
        >
          {t("summary.title")}
        </h2>
        <Summary
          amount={amount}
          allocated={totals.allocated}
          advance={totals.advance}
          over={totals.over}
          method={t(`methods.${method}`)}
        />
        <p className="text-muted-foreground text-xs">{t("summary.preview")}</p>
        <SaveButtons
          busy={busy || (Boolean(trader) && billsQuery.isPending)}
          showNew
          onSubmit={(intent) => void submit(intent)}
        />
      </aside>
    </form>
  );
}

/** The bills area before there is a table: no trader, loading, error, none. */
function BillsBody({
  direction,
  hasTrader,
  query,
  children,
}: {
  direction: PaymentDirection;
  hasTrader: boolean;
  query: ReturnType<typeof useOutstandingBills>;
  children: React.ReactNode;
}) {
  const t = useTranslations("payments");
  if (!hasTrader) {
    return (
      <Placeholder icon={Users} text={t(`bills.pickTrader.${direction}`)} />
    );
  }
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        <span role="status" className="sr-only">
          {t("bills.loading")}
        </span>
        <Skeleton className="h-10" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div
        role="alert"
        className="bg-destructive-soft border-destructive-border text-destructive flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
      >
        <CircleAlert aria-hidden className="size-4 flex-none" />
        {t("bills.error")}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ms-auto"
          onClick={() => void query.refetch()}
        >
          {t("bills.retry")}
        </Button>
      </div>
    );
  }
  if (query.data.bills.length === 0) {
    return (
      <Placeholder
        icon={ReceiptText}
        title={t("bills.none.title")}
        text={t("bills.none.body")}
        testId="no-outstanding-bills"
      />
    );
  }
  return <>{children}</>;
}

function Placeholder({
  icon: Icon,
  title,
  text,
  testId,
}: {
  icon: typeof Users;
  title?: string;
  text: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-surface-muted text-muted-foreground flex items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-sm"
    >
      <span className="bg-card flex size-10 flex-none items-center justify-center rounded-full border">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="flex flex-col gap-0.5">
        {title ? (
          <span className="text-foreground font-semibold">{title}</span>
        ) : null}
        <span>{text}</span>
      </span>
    </div>
  );
}

/** Amount, what the bills take and the advance; a live preview. */
function Summary({
  amount,
  allocated,
  advance,
  over,
  method,
}: {
  amount: string;
  allocated: string;
  advance: string;
  over: boolean;
  method: string;
}) {
  const { formatRs } = useFormat();
  const t = useTranslations("payments");
  const shownAmount = formatRs(amount.trim()) || formatRs("0");
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div className="bg-primary text-primary-foreground rounded-xl px-4 py-3">
        <p className="text-xs font-semibold opacity-80">
          {t("summary.amount")} · {method}
        </p>
        <p
          dir="ltr"
          data-testid="payment-amount-total"
          className="font-heading text-2xl font-extrabold tabular-nums"
        >
          {shownAmount}
        </p>
      </div>
      <dl data-testid="payment-summary" className="flex flex-col gap-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{t("summary.allocated")}</dt>
          <dd
            dir="ltr"
            data-testid="payment-allocated"
            className="font-semibold tabular-nums"
          >
            {formatRs(allocated)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t pt-2">
          <dt className="text-muted-foreground">{t("summary.advance")}</dt>
          <dd
            dir="ltr"
            data-testid="payment-advance"
            className={cn(
              "font-semibold tabular-nums",
              over ? "text-destructive" : undefined,
            )}
          >
            {formatRs(advance)}
          </dd>
        </div>
      </dl>
      {over ? (
        <p
          role="alert"
          className="border-warning/40 bg-warning-soft text-warning flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold"
        >
          <TriangleAlert aria-hidden className="mt-px size-4 flex-none" />
          {t("summary.over")}
        </p>
      ) : null}
    </div>
  );
}

const balanceTone = {
  receivable: "text-foreground",
  payable: "text-success",
  settled: "text-muted-foreground",
} as const;

/** Next to the trader: their khata balance now (`GET /traders/:id`). */
function TraderBalance({ id, traderId }: { id: string; traderId: string }) {
  const { formatRs } = useFormat();
  const t = useTranslations("payments");
  const trader = useTrader(traderId);
  if (trader.isPending || trader.isError) {
    return (
      <p id={id} className="text-muted-foreground text-xs">
        {trader.isPending ? t("balance.loading") : t("balance.error")}
      </p>
    );
  }
  const { kind, amount } = readBalance(trader.data.balance);
  return (
    <p
      id={id}
      data-testid="payment-trader-balance"
      className="text-muted-foreground text-xs"
    >
      {t("balance.label")}:{" "}
      <span
        dir="ltr"
        className={cn("font-semibold tabular-nums", balanceTone[kind])}
      >
        {formatRs(amount)}
      </span>{" "}
      {t(`balance.${kind}`)}
    </p>
  );
}
