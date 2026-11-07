import Decimal from "decimal.js";
import {
  effectiveCharges,
  type ManualCharges,
} from "@/features/purchases/totals";
import { isCompleteItem, toItemInput } from "@/features/purchases/schemas";
import {
  InvalidQuantityError,
  standardCharges,
} from "@/lib/charges/calculate-transaction";
import {
  calculateSale,
  type SaleItemInput,
  type SaleTotals,
} from "@/lib/charges/sale-totals";
import { MAUND_KG } from "@/lib/units";
import type { SaleItemFormValues } from "./schemas";
import type { SalesTranslator } from "./schemas";

/** The calculator's refusal in the form's words (see `text.ts`). */
function reasonOf(t: SalesTranslator, error: InvalidQuantityError): string {
  if (error.message.includes("Rs 0")) return t("breakdown.reasons.netZero");
  if (error.message.includes("too large"))
    return t("breakdown.reasons.tooLarge");
  return t("breakdown.reasons.other");
}

export interface LiveSaleTotals {
  /** Null until one row is complete, or when the bill can't be totalled. */
  totals: SaleTotals | null;
  /** Each form row's amount, or null for a blank or unfinished row. */
  itemAmounts: (string | null)[];
  /** Why the bill can't be totalled, ready to show. */
  error: string | null;
}

/**
 * The live breakdown while typing: the complete rows through the same
 * calculator the server uses (`calculateSale`: net = gross + charges), so
 * the total shown is the total saved. Unfinished rows are left out.
 */
export function liveSaleTotals(
  t: SalesTranslator,
  items: readonly SaleItemFormValues[],
  manual: ManualCharges = {},
): LiveSaleTotals {
  const itemAmounts: (string | null)[] = items.map(() => null);
  const rows: number[] = [];
  const inputs: SaleItemInput[] = [];
  items.forEach((item, index) => {
    if (!isCompleteItem(item) || !item.commodity) return;
    const { weightKg, rate, rateUnit, bags } = toItemInput(item);
    rows.push(index);
    inputs.push({
      weightKg,
      rate,
      rateUnit,
      bags,
      charges: standardCharges(
        effectiveCharges(item.commodity.charges, manual),
      ),
    });
  });
  if (inputs.length === 0) return { totals: null, itemAmounts, error: null };

  try {
    const totals = calculateSale(inputs, MAUND_KG);
    totals.itemAmounts.forEach((amount, k) => {
      itemAmounts[rows[k]] = amount;
    });
    return { totals, itemAmounts, error: null };
  } catch (error) {
    if (!(error instanceof InvalidQuantityError)) throw error;
    return { totals: null, itemAmounts, error: reasonOf(t, error) };
  }
}

export interface CreditCheckInput {
  /** The buyer's khata balance now (debit − credit), from `GET /traders/:id`. */
  balance: string;
  /** `traders.credit_limit`; null = no limit. */
  creditLimit: string | null;
  /** This sale's net (the live total). */
  netAmount: string;
  /** Received on this sale (an edit keeps the saved amount). Default "0". */
  receivedAmount?: string;
  /**
   * What the sale being edited already put in this buyer's balance
   * (net − received); "0" for a new sale or another buyer.
   */
  alreadyInBalance?: string;
}

export interface CreditWarning {
  /** What the buyer would owe after this save, 2 decimals. */
  owed: string;
  creditLimit: string;
}

/**
 * The warning before save, by the server's rule: a save is over the limit
 * when it raises what the buyer owes and leaves it above the limit (exactly
 * at the limit is fine; a limit of 0 means no credit). Null when not over.
 */
export function creditWarning({
  balance,
  creditLimit,
  netAmount,
  receivedAmount = "0",
  alreadyInBalance = "0",
}: CreditCheckInput): CreditWarning | null {
  if (creditLimit === null) return null;
  const before = new Decimal(balance);
  const after = before
    .minus(alreadyInBalance)
    .plus(netAmount)
    .minus(receivedAmount);
  if (!after.greaterThan(before) || !after.greaterThan(creditLimit)) {
    return null;
  }
  return { owed: after.toFixed(2), creditLimit };
}
