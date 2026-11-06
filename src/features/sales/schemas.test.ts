import { describe, expect, it } from "vitest";
import { toSaleFormField, toSaleFormValues, toSaleInput } from "./schemas";
import { chanaItem, savedSale, ticketSale } from "./test-data";

const LOT = "dddddddd-1111-4111-8111-111111111111";

describe("sale schemas", () => {
  const sale = savedSale({
    ...ticketSale,
    items: [{ ...ticketSale.items[0], purchaseItemId: LOT }],
  });

  it("opens a saved sale with weights in kg and its lots", () => {
    const values = toSaleFormValues(sale, chanaItem.charges);
    expect(values.buyer).toMatchObject({ id: sale.buyer.id, type: "beopari" });
    expect(values.items[0]).toMatchObject({
      weight: "1000",
      weightUnit: "kg",
      rate: "4000",
      bags: "10",
      lot: { purchaseItemId: LOT, commodityId: sale.items[0].commodityId },
    });
  });

  it("sends a saved lot back while its commodity is unchanged", () => {
    const values = toSaleFormValues(sale, chanaItem.charges);
    expect(toSaleInput(values).input.items[0]).toEqual({
      commodityId: sale.items[0].commodityId,
      purchaseItemId: LOT,
      bags: 10,
      weightKg: "1000.000",
      rate: "4000",
      rateUnit: "maund",
    });

    // Another commodity: the lot (of the old one) no longer applies.
    values.items[0].commodity = chanaItem;
    expect(toSaleInput(values).input.items[0]).not.toHaveProperty(
      "purchaseItemId",
    );
  });

  it("puts server errors on the beopari, the row and the lot's commodity", () => {
    expect(toSaleFormField("buyerId", [0])).toBe("buyer");
    expect(toSaleFormField("saleDate", [0])).toBe("saleDate");
    expect(toSaleFormField("items.0.weightKg", [2])).toBe("items.2.weight");
    expect(toSaleFormField("items.0.purchaseItemId", [1])).toBe(
      "items.1.commodity",
    );
    expect(toSaleFormField("items", [0])).toBe("items");
    expect(toSaleFormField("receivedAmount", [0])).toBeNull();
  });
});
