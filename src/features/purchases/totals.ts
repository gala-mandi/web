import type { EffectiveCharges } from "@/features/commodities/types";
import {
  InvalidQuantityError,
  standardCharges,
} from "@/lib/charges/calculate-transaction";
import {
  calculatePurchase,
  type PurchaseItemInput,
  type PurchaseTotals,
} from "@/lib/charges/purchase-totals";
import { MAUND_KG } from "@/lib/units";
import {
  isCompleteItem,
  type PurchaseItemFormValues,
  toItemInput,
} from "./schemas";
import type { PurchaseCharge } from "./types";

/** Charges typed on (or saved with) the parchi; missing = not set. */
export type ManualCharges = Partial<EffectiveCharges>;

const chargeKeys = {
  commissionPct: { type: "commission", basis: "percent" },
  marketFeePct: { type: "market_fee", basis: "percent" },
  labourPerBag: { type: "labour", basis: "per_bag" },
} as const satisfies Record<
  keyof EffectiveCharges,
  Pick<PurchaseCharge, "type" | "basis">
>;

/**
 * The charges that apply to an item, as the server decides them: the
 * parchi's own value wins, then the commodity's (the lookup already folds
 * in the shop default). "0.00" is a real value; only a missing one falls back.
 */
export function effectiveCharges(
  commodity: EffectiveCharges,
  manual: ManualCharges = {},
): EffectiveCharges {
  return {
    commissionPct: manual.commissionPct ?? commodity.commissionPct,
    marketFeePct: manual.marketFeePct ?? commodity.marketFeePct,
    labourPerBag: manual.labourPerBag ?? commodity.labourPerBag,
  };
}

/**
 * The rates an edit keeps (server `savedRates`): a charge type with one rate
 * on the bill keeps it for every item; a type with two rates (mixed
 * commodities) is left to each commodity.
 */
export function savedRates(charges: readonly PurchaseCharge[]): ManualCharges {
  const rates: ManualCharges = {};
  for (const [key, { type, basis }] of Object.entries(chargeKeys)) {
    const values = new Set(
      charges
        .filter((c) => c.type === type && c.basis === basis)
        .map((c) => c.value),
    );
    if (values.size === 1) {
      rates[key as keyof EffectiveCharges] = [...values][0];
    }
  }
  return rates;
}

/**
 * Charges for the items a saved bill already has (edit). The lookup isn't
 * asked again, so a type with two rates uses the first one saved.
 */
export function savedItemCharges(
  charges: readonly PurchaseCharge[],
): EffectiveCharges {
  const first = (key: keyof EffectiveCharges) =>
    charges.find(
      (c) =>
        c.type === chargeKeys[key].type && c.basis === chargeKeys[key].basis,
    )?.value ?? "0.00";
  return {
    commissionPct: first("commissionPct"),
    marketFeePct: first("marketFeePct"),
    labourPerBag: first("labourPerBag"),
  };
}

export interface LiveTotals {
  /** Null until one row is complete, or when the bill can't be totalled. */
  totals: PurchaseTotals | null;
  /** Each form row's amount, or null for a blank or unfinished row. */
  itemAmounts: (string | null)[];
  /** Why the bill can't be totalled, e.g. "the net amount comes to Rs 0". */
  error: string | null;
}

/**
 * The live breakdown while typing: the complete rows through the same
 * calculator the server uses (`calculatePurchase`), so the total shown is
 * the total saved. Unfinished rows are left out until they are complete.
 */
export function liveTotals(
  items: readonly PurchaseItemFormValues[],
  manual: ManualCharges = {},
): LiveTotals {
  const itemAmounts: (string | null)[] = items.map(() => null);
  const rows: number[] = [];
  const inputs: PurchaseItemInput[] = [];
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
    const totals = calculatePurchase(inputs, MAUND_KG);
    totals.itemAmounts.forEach((amount, k) => {
      itemAmounts[rows[k]] = amount;
    });
    return { totals, itemAmounts, error: null };
  } catch (error) {
    if (!(error instanceof InvalidQuantityError)) throw error;
    return {
      totals: null,
      itemAmounts,
      error: error.message.slice(error.field.length + 2),
    };
  }
}
