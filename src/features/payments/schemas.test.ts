import { testTranslator } from "@/test/intl";
import { describe, expect, it } from "vitest";
import { KISSAN } from "@/features/purchases/test-data";
import {
  emptyPaymentValues,
  type PaymentFormValues,
  paymentFormSchema,
  toPaymentFormField,
  toPaymentInput,
} from "./schemas";
import { openBills, TODAY } from "./test-data";

const tr = testTranslator("payments");

const rafiq = {
  id: KISSAN.id,
  type: "kissan" as const,
  name: KISSAN.name,
  fatherName: null,
  phone: null,
  village: null,
};

const values = (over: Partial<PaymentFormValues> = {}): PaymentFormValues => ({
  ...emptyPaymentValues(TODAY),
  trader: rafiq,
  amount: "40000",
  ...over,
});

const issues = (v: PaymentFormValues) => {
  const result = paymentFormSchema(
    TODAY,
    "paid",
    openBills,
    tr,
    "en",
  ).safeParse(v);
  return result.success
    ? []
    : result.error.issues.map((i) => [i.path.join("."), i.message]);
};

describe("paymentFormSchema", () => {
  it("needs a kissan, a date not in the future and an amount above 0", () => {
    expect(issues(values())).toEqual([]);
    expect(
      issues(values({ trader: null, amount: "0", paymentDate: "2026-11-07" })),
    ).toEqual([
      ["paymentDate", "A voucher can’t be dated in the future"],
      ["trader", "Choose a kissan"],
      ["amount", "Enter an amount above 0"],
    ]);
    expect(issues(values({ amount: "12.345" }))).toEqual([
      ["amount", "Enter an amount in rupees (up to 2 decimals)"],
    ]);
  });

  it("checks typed shares against each bill and the amount", () => {
    const [b1, b2] = openBills;
    expect(
      issues(values({ manual: { [b1.id]: "35000", [b2.id]: "1.234" } })),
    ).toEqual([
      [`manual.${b1.id}`, "Only Rs 30,000.00 is left on this bill"],
      [`manual.${b2.id}`, "Enter rupees (up to 2 decimals)"],
    ]);
    expect(
      issues(values({ manual: { [b1.id]: "30000", [b2.id]: "20000" } })),
    ).toEqual([
      [
        "amount",
        "The bills take Rs 50,000.00; enter at least that, or lower a bill",
      ],
    ]);
  });
});

describe("toPaymentInput", () => {
  it("auto: the bills the amount reaches, oldest first, without amounts", () => {
    const { input, billIds } = toPaymentInput(
      values({ reference: "  ", notes: " Truck 2 " }),
      "paid",
      openBills,
    );
    expect(input).toEqual({
      direction: "paid",
      traderId: KISSAN.id,
      paymentDate: TODAY,
      amount: "40000",
      method: "cash",
      reference: null,
      notes: "Truck 2",
      allocations: [
        { purchaseId: openBills[0].id },
        { purchaseId: openBills[1].id },
      ],
    });
    expect(billIds).toEqual([openBills[0].id, openBills[1].id]);
  });

  it("manual: each typed bill with its amount; a receipt settles sales", () => {
    const { input, billIds } = toPaymentInput(
      values({ manual: { [openBills[2].id]: "40000", [openBills[0].id]: "" } }),
      "received",
      openBills,
    );
    expect(input.allocations).toEqual([
      { saleId: openBills[2].id, amount: "40000" },
    ]);
    expect(billIds).toEqual([openBills[2].id]);
  });

  it("cleared: nothing allocated, all of it is an advance", () => {
    expect(
      toPaymentInput(values({ manual: {} }), "paid", openBills).input
        .allocations,
    ).toEqual([]);
  });
});

describe("toPaymentFormField", () => {
  it("puts server errors on the trader, amount and bill rows", () => {
    const ids = [openBills[1].id];
    expect(toPaymentFormField("traderId", ids)).toBe("trader");
    expect(toPaymentFormField("amount", ids)).toBe("amount");
    expect(toPaymentFormField("allocations.0.amount", ids)).toBe(
      `manual.${openBills[1].id}`,
    );
    expect(toPaymentFormField("allocations.0.purchaseId", ids)).toBe(
      `manual.${openBills[1].id}`,
    );
    expect(toPaymentFormField("allocations.3.amount", ids)).toBeNull();
    expect(toPaymentFormField("Idempotency-Key", ids)).toBeNull();
  });
});
