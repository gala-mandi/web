import { describe, expect, it } from "vitest";
import { sourceHref } from "./sources";

const all = { purchases: true, sales: true, payments: true };
const id = "abc";

describe("sourceHref", () => {
  it("opens the purchase or sale behind a line", () => {
    expect(
      sourceHref(
        { sourceType: "purchase", sourceId: id, narration: null },
        all,
      ),
    ).toBe("/purchases/abc");
    expect(
      sourceHref({ sourceType: "sale", sourceId: id, narration: null }, all),
    ).toBe("/sales/abc");
  });

  it("opens the cancelled or edited document of a reversal", () => {
    expect(
      sourceHref(
        {
          sourceType: "reversal",
          sourceId: id,
          narration: "Purchase PUR-1 cancelled",
        },
        all,
      ),
    ).toBe("/purchases/abc");
    expect(
      sourceHref(
        {
          sourceType: "reversal",
          sourceId: id,
          narration: "Sale SAL-1 edited",
        },
        all,
      ),
    ).toBe("/sales/abc");
    expect(
      sourceHref(
        {
          sourceType: "reversal",
          sourceId: id,
          narration: "Opening balance corrected",
        },
        all,
      ),
    ).toBeNull();
  });

  it("opens the voucher behind a payment or receipt, and of its reversal", () => {
    for (const sourceType of ["payment", "receipt"] as const) {
      expect(
        sourceHref({ sourceType, sourceId: id, narration: null }, all),
      ).toBe("/payments/abc");
    }
    for (const narration of [
      "Payment PAY-2026-27-000001 cancelled",
      "Receipt RCT-2026-27-000001 cancelled",
    ]) {
      expect(
        sourceHref({ sourceType: "reversal", sourceId: id, narration }, all),
      ).toBe("/payments/abc");
    }
    expect(
      sourceHref(
        { sourceType: "receipt", sourceId: id, narration: null },
        { ...all, payments: false },
      ),
    ).toBeNull();
  });

  it("links nothing without a page or without access", () => {
    for (const sourceType of ["opening", "adjustment"] as const) {
      expect(
        sourceHref({ sourceType, sourceId: id, narration: null }, all),
      ).toBeNull();
    }
    expect(
      sourceHref(
        { sourceType: "purchase", sourceId: null, narration: null },
        all,
      ),
    ).toBeNull();
    expect(
      sourceHref(
        { sourceType: "sale", sourceId: id, narration: null },
        { purchases: true, sales: false, payments: true },
      ),
    ).toBeNull();
  });
});
