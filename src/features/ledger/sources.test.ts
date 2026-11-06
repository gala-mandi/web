import { describe, expect, it } from "vitest";
import { sourceHref } from "./sources";

const all = { purchases: true, sales: true };
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

  it("links nothing without a page or without access", () => {
    for (const sourceType of [
      "payment",
      "receipt",
      "opening",
      "adjustment",
    ] as const) {
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
        { purchases: true, sales: false },
      ),
    ).toBeNull();
  });
});
