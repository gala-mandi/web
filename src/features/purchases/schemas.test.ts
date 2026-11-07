import { testTranslator } from "@/test/intl";
import { describe, expect, it } from "vitest";
import {
  emptyItem,
  isBlankItem,
  itemWeightKg,
  type PurchaseItemFormValues,
  toFormField,
  toPurchaseFormValues,
} from "./schemas";
import { chanaItem, gandumItem, savedPurchase, ticketInput } from "./test-data";
import { liveTotals, savedItemCharges, savedRates } from "./totals";

const tr = testTranslator("purchases");

const row = (
  overrides: Partial<PurchaseItemFormValues> = {},
): PurchaseItemFormValues => ({
  ...emptyItem(),
  commodity: gandumItem,
  bags: "10",
  weight: "25",
  rate: "4000",
  ...overrides,
});

describe("item weights", () => {
  it("reads maund as 40 kg and kg as kg, 3 decimals", () => {
    expect(itemWeightKg(row({ weight: "25.25" }))).toBe("1010.000");
    expect(itemWeightKg(row({ weight: "1010.5", weightUnit: "kg" }))).toBe(
      "1010.500",
    );
    expect(itemWeightKg(row({ weight: "0" }))).toBeNull();
    expect(
      itemWeightKg(row({ weight: "1.0001", weightUnit: "kg" })),
    ).toBeNull();
  });

  it("treats a row with nothing typed as blank", () => {
    expect(isBlankItem(emptyItem())).toBe(true);
    expect(isBlankItem(row())).toBe(false);
  });
});

describe("toFormField", () => {
  it("maps server fields to the form, skipping blank rows", () => {
    const rows = [0, 2];
    expect(toFormField("traderId", rows)).toBe("trader");
    expect(toFormField("purchaseDate", rows)).toBe("purchaseDate");
    expect(toFormField("items", rows)).toBe("items");
    expect(toFormField("items.1.weightKg", rows)).toBe("items.2.weight");
    expect(toFormField("items.0.commodityId", rows)).toBe("items.0.commodity");
    expect(toFormField("items.1", rows)).toBe("items.2.rate");
    expect(toFormField("items.5.rate", rows)).toBeNull();
    expect(toFormField("paidAmount", rows)).toBeNull();
    expect(toFormField("Idempotency-Key", rows)).toBeNull();
  });
});

describe("liveTotals", () => {
  it("leaves unfinished rows out until they are complete", () => {
    const live = liveTotals(tr, [
      row(),
      row({ commodity: chanaItem, rate: "" }),
    ]);
    expect(live.itemAmounts).toEqual(["100000.00", null]);
    expect(live.totals?.netAmount).toBe("97300.00");
  });

  it("says why a bill can't be totalled", () => {
    const live = liveTotals(tr, [row({ rate: "0.01", weight: "0.001" })]);
    expect(live.totals).toBeNull();
    expect(live.error).toBe(
      "Can’t total this bill: the charges of item 1 are more than its amount.",
    );
  });

  it("an edit keeps the bill's own rates for every item", () => {
    const purchase = savedPurchase(ticketInput);
    expect(savedRates(purchase.charges)).toEqual({
      commissionPct: "2.00",
      marketFeePct: "0.50",
      labourPerBag: "20.00",
    });
    const values = toPurchaseFormValues(
      purchase,
      savedItemCharges(purchase.charges),
    );
    expect(values.items[0]).toMatchObject({
      weight: "1000",
      weightUnit: "kg",
      rate: "4000",
      bags: "10",
    });
    // A Chana row added on edit also takes the bill's 2% (shop default 2.5%).
    const live = liveTotals(
      tr,

      [...values.items, row({ commodity: chanaItem, bags: "", weight: "1" })],
      savedRates(purchase.charges),
    );
    expect(live.totals?.charges.map((c) => c.value)).toEqual([
      "2.00",
      "0.50",
      "20.00",
    ]);
  });
});
