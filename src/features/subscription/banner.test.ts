import { describe, expect, it } from "vitest";
import { bannerFor } from "./banner";
import { shopStates, subscriptionView, TODAY } from "./test-data";

describe("bannerFor", () => {
  it.each([
    ["trial", shopStates.trial, { kind: "trial", dismissible: true }],
    ["expiring", shopStates.expiring, { kind: "expiring", dismissible: true }],
    ["grace", shopStates.grace, { kind: "grace", dismissible: false }],
    [
      "read-only",
      shopStates.readOnly,
      { kind: "read_only", dismissible: false },
    ],
  ] as const)("%s", (_label, shop, expected) => {
    expect(bannerFor(shop)).toEqual(expected);
  });

  it("a paid plan with more than 7 days left shows nothing", () => {
    expect(bannerFor(shopStates.quiet)).toBeNull();
  });

  it("7 days left is 'expiring'; 8 is not", () => {
    const at = (daysLeft: number) =>
      bannerFor({
        today: TODAY,
        state: "active",
        subscription: subscriptionView({ daysLeft }),
      });
    expect(at(7)?.kind).toBe("expiring");
    expect(at(8)).toBeNull();
  });

  it("no plan at all is read-only; nothing loaded yet shows nothing", () => {
    expect(
      bannerFor({ today: TODAY, state: "read_only", subscription: null }),
    ).toEqual({ kind: "read_only", dismissible: false });
    expect(bannerFor(undefined)).toBeNull();
  });
});
