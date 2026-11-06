import { describe, expect, it } from "vitest";
import { addDays, compareMoney, datesBetween, isCalendarDate } from "./values";

describe("compareMoney", () => {
  it("compares rupee strings as decimals, not text or floats", () => {
    expect(compareMoney("900.5", "900.50")).toBe(0);
    expect(compareMoney("1000", "999.99")).toBe(1);
    expect(compareMoney("999.99", "1000")).toBe(-1);
    expect(compareMoney("0040", "40.00")).toBe(0);
    expect(compareMoney("4200.05", "4200.5")).toBe(-1);
    // Past the float's exact range: 2^53 + 1 vs 2^53.
    expect(compareMoney("9007199254740993", "9007199254740992")).toBe(1);
  });
});

describe("calendar dates", () => {
  it("steps whole days across months and years", () => {
    expect(addDays("2026-11-06", -1)).toBe("2026-11-05");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("lists every day of a range, both ends included", () => {
    expect(datesBetween("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });

  it("only real YYYY-MM-DD dates", () => {
    expect(isCalendarDate("2026-11-06")).toBe(true);
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("6-11-2026")).toBe(false);
    expect(isCalendarDate("today")).toBe(false);
  });
});
