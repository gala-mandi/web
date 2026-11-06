import { testTranslator } from "@/test/intl";
import { describe, expect, it } from "vitest";
import { emptySaleItem } from "./schemas";
import { gandumItem } from "./test-data";
import { creditWarning, liveSaleTotals } from "./totals";

const tr = testTranslator("sales");

describe("liveSaleTotals", () => {
  it("adds the charges to the gross: 100,000 + 2,700 = 102,700", () => {
    const live = liveSaleTotals(tr, [
      {
        ...emptySaleItem(),
        commodity: gandumItem,
        bags: "10",
        weight: "25",
        rate: "4000",
      },
      emptySaleItem(),
    ]);
    expect(live.error).toBeNull();
    expect(live.itemAmounts).toEqual(["100000.00", null]);
    expect(live.totals).toMatchObject({
      grossAmount: "100000.00",
      totalCharges: "2700.00",
      rounding: "0.00",
      netAmount: "102700.00",
    });
  });

  it("uses an edit's saved rates over the commodity's", () => {
    const live = liveSaleTotals(
      tr,

      [
        {
          ...emptySaleItem(),
          commodity: gandumItem,
          weight: "25",
          rate: "4000",
        },
      ],
      { commissionPct: "1.00", marketFeePct: "0.00" },
    );
    expect(live.totals?.totalCharges).toBe("1000.00");
  });

  it("says why a bill can't be totalled", () => {
    const live = liveSaleTotals(tr, [
      {
        ...emptySaleItem(),
        commodity: {
          ...gandumItem,
          charges: {
            ...gandumItem.charges,
            commissionPct: "0.00",
            marketFeePct: "0.00",
            labourPerBag: "0.00",
          },
        },
        weight: "0.001",
        rate: "0.01",
        rateUnit: "kg",
        weightUnit: "kg",
      },
    ]);
    expect(live.totals).toBeNull();
    expect(live.error).toBe(
      "Can’t total this bill: the net amount comes to Rs 0.",
    );
  });
});

describe("creditWarning", () => {
  const base = {
    balance: "20000.00",
    creditLimit: "120000.00",
    netAmount: "102700.00",
  };

  it("warns when the balance plus this sale goes above the limit", () => {
    expect(creditWarning(base)).toEqual({
      owed: "122700.00",
      creditLimit: "120000.00",
    });
  });

  it("is fine at or under the limit, and with no limit", () => {
    expect(creditWarning({ ...base, netAmount: "100000.00" })).toBeNull();
    expect(creditWarning({ ...base, netAmount: "90000.00" })).toBeNull();
    expect(creditWarning({ ...base, creditLimit: null })).toBeNull();
  });

  it("a limit of 0 means no credit at all", () => {
    expect(
      creditWarning({ balance: "0.00", creditLimit: "0.00", netAmount: "1" }),
    ).toEqual({ owed: "1.00", creditLimit: "0.00" });
  });

  it("counts what is received on the sale", () => {
    expect(creditWarning({ ...base, receivedAmount: "5000.00" })).toBeNull();
  });

  it("on an edit, only the change counts, and a smaller sale never warns", () => {
    // The balance already holds the saved Rs 102,700 (now 122,700 owed).
    const edit = {
      ...base,
      balance: "122700.00",
      alreadyInBalance: "102700.00",
    };
    expect(creditWarning({ ...edit, netAmount: "102700.00" })).toBeNull();
    expect(creditWarning({ ...edit, netAmount: "90000.00" })).toBeNull();
    expect(creditWarning({ ...edit, netAmount: "110000.00" })).toEqual({
      owed: "130000.00",
      creditLimit: "120000.00",
    });
  });
});
