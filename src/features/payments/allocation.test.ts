import { describe, expect, it } from "vitest";
import {
  allocationTotals,
  autoAllocate,
  isMoney,
  leftAfter,
  oldestFirst,
  totalOutstanding,
} from "./allocation";
import { openBills, rafiqBills } from "./test-data";

describe("oldestFirst", () => {
  it("keeps the bills with something outstanding, oldest first", () => {
    expect(oldestFirst(rafiqBills.data).map((b) => b.billNo)).toEqual([
      "PUR-2026-27-000001",
      "PUR-2026-27-000002",
      "PUR-2026-27-000003",
    ]);
    expect(oldestFirst(rafiqBills.data)).toEqual(openBills);
  });
});

describe("autoAllocate", () => {
  it("fills the oldest bill first, then the next, until the amount runs out", () => {
    expect(autoAllocate("100000", openBills)).toEqual([
      "30000.00",
      "50000.00",
      "20000.00",
    ]);
    expect(autoAllocate("40000", openBills)).toEqual([
      "30000.00",
      "10000.00",
      "0.00",
    ]);
  });

  it("settles every bill and leaves the rest as an advance", () => {
    const shares = autoAllocate("200000", openBills);
    expect(shares).toEqual(["30000.00", "50000.00", "100000.00"]);
    expect(allocationTotals("200000", shares)).toEqual({
      allocated: "180000.00",
      advance: "20000.00",
      over: false,
    });
  });

  it("is exact to the paisa (no float maths)", () => {
    const bills = [
      { ...openBills[0], outstanding: "0.10" },
      { ...openBills[1], outstanding: "0.20" },
    ];
    expect(autoAllocate("0.3", bills)).toEqual(["0.10", "0.20"]);
    expect(allocationTotals("0.3", ["0.10", "0.20"]).advance).toBe("0.00");
  });

  it("gives nothing for a blank or bad amount", () => {
    expect(autoAllocate("", openBills)).toEqual(["0.00", "0.00", "0.00"]);
    expect(autoAllocate("12,000", openBills)).toEqual(["0.00", "0.00", "0.00"]);
  });
});

describe("allocationTotals", () => {
  it("adds typed shares (blank = 0) and flags more than the amount", () => {
    expect(allocationTotals("50000", ["30000", "", "25000.50"])).toEqual({
      allocated: "55000.50",
      advance: "-5000.50",
      over: true,
    });
  });
});

describe("helpers", () => {
  it("leftAfter, totalOutstanding and isMoney", () => {
    expect(leftAfter(openBills[1], "10000")).toBe("40000.00");
    expect(leftAfter(openBills[1], "")).toBe("50000.00");
    expect(totalOutstanding(openBills)).toBe("180000.00");
    expect(isMoney("40000")).toBe(true);
    expect(isMoney("40000.55")).toBe(true);
    expect(isMoney("40000.555")).toBe(false);
    expect(isMoney("-5")).toBe(false);
  });
});
