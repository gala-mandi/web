import { z } from "zod";
import type { TraderLookupItem } from "@/features/traders/types";
import { formatRs } from "@/lib/format";
import {
  allocationTotals,
  autoAllocate,
  cleanAmount,
  isAboveZero,
  isMoney,
  isOverBill,
  type OutstandingBill,
} from "./allocation";
import { paymentText } from "./text";
import type {
  AllocationInput,
  CreatePaymentInput,
  PaymentDirection,
  PaymentMethod,
} from "./types";
import { paymentMethods } from "./types";

const e = paymentText.errors;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REFERENCE = 80;
const MAX_NOTES = 1000;

export interface PaymentFormValues {
  /** YYYY-MM-DD, Asia/Karachi. */
  paymentDate: string;
  trader: TraderLookupItem | null;
  /** Rupees as typed, e.g. "40000". */
  amount: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
  /**
   * Rupees per bill id, typed by hand (manual override). null = auto-
   * allocate oldest first from the amount.
   */
  manual: Record<string, string> | null;
}

export function emptyPaymentValues(today: string): PaymentFormValues {
  return {
    paymentDate: today,
    trader: null,
    amount: "",
    method: "cash",
    reference: "",
    notes: "",
    manual: null,
  };
}

/** What each bill takes now: the auto split or the typed amounts. */
export function sharesOf(
  values: Pick<PaymentFormValues, "amount" | "manual">,
  bills: readonly OutstandingBill[],
): string[] {
  if (!values.manual) return autoAllocate(values.amount, bills);
  const manual = values.manual;
  return bills.map((bill) => manual[bill.id] ?? "");
}

/**
 * The form's schema. `today` (Asia/Karachi) is the latest date allowed;
 * typed shares are checked against `bills` (each at most what is left on
 * its bill, together at most the amount).
 */
export function paymentFormSchema(
  today: string,
  direction: PaymentDirection,
  bills: readonly OutstandingBill[],
) {
  return z
    .object({
      paymentDate: z
        .string()
        .trim()
        .regex(DATE, e.dateRequired)
        .refine((v) => v <= today, e.dateInFuture),
      trader: z
        .custom<TraderLookupItem | null>()
        .refine(Boolean, e.traderRequired[direction]),
      amount: z
        .string()
        .trim()
        .min(1, e.amountRequired)
        .refine(isMoney, e.amount)
        .refine(isAboveZero, e.amountZero),
      method: z.enum(paymentMethods),
      reference: z.string().trim().max(MAX_REFERENCE, e.referenceTooLong),
      notes: z.string().max(MAX_NOTES, e.notesTooLong),
      manual: z.record(z.string(), z.string()).nullable(),
    })
    .superRefine((values, ctx) => {
      if (!values.manual) return;
      let sharesOk = true;
      for (const bill of bills) {
        const share = cleanAmount(values.manual[bill.id]);
        if (!share) continue;
        const message = !isMoney(share)
          ? e.share
          : isOverBill(bill, share)
            ? e.shareOverBill(formatRs(bill.outstanding))
            : null;
        if (message) {
          sharesOk = false;
          ctx.addIssue({ code: "custom", path: ["manual", bill.id], message });
        }
      }
      if (!sharesOk || !isMoney(values.amount)) return;
      const totals = allocationTotals(values.amount, sharesOf(values, bills));
      if (totals.over) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: e.amountBelowBills(formatRs(totals.allocated)),
        });
      }
    });
}

/**
 * The request body. Auto: the bills the amount reaches, oldest first and
 * without amounts, so the server fills them by the same rule from what is
 * outstanding when it saves. Manual: each bill with a typed amount above 0.
 * `billIds[i]` is the bill of the i-th allocation sent, so
 * `allocations.1.amount` from the server lands on its row.
 */
export function toPaymentInput(
  values: PaymentFormValues,
  direction: PaymentDirection,
  bills: readonly OutstandingBill[],
): { input: CreatePaymentInput; billIds: string[] } {
  const shares = sharesOf(values, bills);
  const billIds: string[] = [];
  const allocations: AllocationInput[] = [];
  bills.forEach((bill, i) => {
    const share = cleanAmount(shares[i]);
    if (!isAboveZero(share)) return;
    billIds.push(bill.id);
    const line: AllocationInput =
      direction === "paid" ? { purchaseId: bill.id } : { saleId: bill.id };
    allocations.push(values.manual ? { ...line, amount: share } : line);
  });
  const reference = values.reference.trim();
  const notes = values.notes.trim();
  return {
    input: {
      direction,
      traderId: values.trader?.id ?? "",
      paymentDate: values.paymentDate,
      amount: values.amount.trim(),
      method: values.method,
      reference: reference || null,
      notes: notes || null,
      allocations,
    },
    billIds,
  };
}

/** Server field → form field. */
const headerFields: Record<string, keyof PaymentFormValues> = {
  traderId: "trader",
  paymentDate: "paymentDate",
  amount: "amount",
  method: "method",
  reference: "reference",
  notes: "notes",
};

/**
 * Where a server field error goes: `traderId` → the trader, `amount` (also
 * the shop's over-payment block) → the amount, `allocations.1.amount` or
 * `allocations.1.purchaseId` → that bill's row. Null for errors no field
 * shows.
 */
export function toPaymentFormField(
  field: string,
  billIds: readonly string[],
): string | null {
  if (headerFields[field]) return headerFields[field];
  const match = /^allocations\.(\d+)\.(amount|purchaseId|saleId)$/.exec(field);
  const billId = match ? billIds[Number(match[1])] : undefined;
  return billId ? `manual.${billId}` : null;
}
