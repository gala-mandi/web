import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  calculateTransaction,
  InvalidQuantityError,
  standardCharges,
  type RateUnit,
  type TransactionBreakdown,
  type TransactionInput,
} from "./calculate-transaction";
import fixtures from "./calculate-transaction.fixtures.json";

/**
 * Contract fixtures: byte-identical to the server's
 * `src/common/charges/calculate-transaction.fixtures.json`, so the server
 * and the web give the same numbers for the same input.
 */
const TRANSACTION_FIXTURES = fixtures as {
  name: string;
  input: TransactionInput;
  expected: TransactionBreakdown;
}[];

const base: TransactionInput = {
  kind: "purchase",
  weightKg: "1000",
  rate: "4000",
  rateUnit: "maund",
  maundKg: "40",
  bags: 10,
  charges: [],
};

describe("calculateTransaction()", () => {
  it.each(TRANSACTION_FIXTURES)("$name", ({ input, expected }) => {
    expect(calculateTransaction(input)).toEqual(expected);
  });

  it("every fixture adds up on the parchi: gross ∓ charges + rounding = net", () => {
    for (const { input, expected } of TRANSACTION_FIXTURES) {
      const sign = input.kind === "purchase" ? -1 : 1;
      const sum = expected.charges.reduce(
        (t, c) => t.plus(c.amount),
        new Decimal(0),
      );
      expect(sum.toFixed(2)).toBe(expected.totalCharges);
      expect(
        new Decimal(expected.gross)
          .plus(new Decimal(expected.totalCharges).times(sign))
          .plus(expected.rounding)
          .toFixed(2),
      ).toBe(expected.net);
    }
  });

  it("standard charges from the commodity lookup: 2% + 0.5% + Rs 20 × 10 bags", () => {
    const result = calculateTransaction({
      ...base,
      charges: standardCharges({
        commissionPct: "2.00",
        marketFeePct: "0.50",
        labourPerBag: "20.00",
      }),
    });
    expect(result.charges.map((c) => [c.type, c.basis, c.amount])).toEqual([
      ["commission", "percent", "2000.00"],
      ["market_fee", "percent", "500.00"],
      ["labour", "per_bag", "200.00"],
    ]);
    expect(result.net).toBe("97300.00");
  });

  describe("validation errors", () => {
    const fails = (patch: Partial<TransactionInput>, field: string) => {
      const run = () => calculateTransaction({ ...base, ...patch });
      expect(run).toThrow(InvalidQuantityError);
      expect(run).toThrow(new RegExp(`^${field.replace(/[[\]]/g, "\\$&")}:`));
    };

    it("zero weight", () => fails({ weightKg: "0" }, "weightKg"));
    it("negative weight", () => fails({ weightKg: "-5" }, "weightKg"));
    it("negative rate", () => fails({ rate: "-4000" }, "rate"));
    it("rate that is not a number", () => fails({ rate: "4,000" }, "rate"));
    it("maund of 0 kg", () => fails({ maundKg: "0" }, "maundKg"));
    it("unknown rate unit", () =>
      fails({ rateUnit: "ton" as RateUnit }, "rateUnit"));
    it("per-bag rate without bags", () =>
      fails({ rateUnit: "bag", bags: null }, "bags"));
    it("part bag", () => fails({ bags: 2.5 }, "bags"));
    it("percent over 100", () =>
      fails(
        {
          charges: [{ type: "commission", basis: "percent", value: "100.01" }],
        },
        "charges[0].value",
      ));
    it("purchase charges more than the gross", () =>
      fails(
        {
          weightKg: "1",
          rate: "10",
          rateUnit: "kg",
          bags: 1,
          charges: [{ type: "labour", basis: "per_bag", value: "20" }],
        },
        "charges",
      ));
    it("gross too large for numeric(14,2)", () =>
      fails(
        { weightKg: "999999999.999", rate: "1001", rateUnit: "kg" },
        "gross",
      ));
  });
});
