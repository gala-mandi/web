import { describe, expect, it } from "vitest";
import {
  daysIn,
  presetOf,
  presetRange,
  resolveRange,
  shiftDay,
  weekStart,
} from "./range";

// 6 Nov 2026 is a Friday.
const TODAY = "2026-11-06";

describe("report date presets", () => {
  it("today, this week (from Monday) and this month end today", () => {
    expect(presetRange("today", TODAY)).toEqual({ from: TODAY, to: TODAY });
    expect(presetRange("week", TODAY)).toEqual({
      from: "2026-11-02",
      to: TODAY,
    });
    expect(presetRange("month", TODAY)).toEqual({
      from: "2026-11-01",
      to: TODAY,
    });
  });

  it("weeks run Monday to Sunday, across months and years", () => {
    expect(weekStart("2026-11-02")).toBe("2026-11-02"); // Monday
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // Sunday
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // Sunday
    expect(weekStart("2027-01-01")).toBe("2026-12-28"); // Friday
  });

  it("names the preset of a range, today first, else custom", () => {
    expect(presetOf({ from: TODAY, to: TODAY }, TODAY)).toBe("today");
    expect(presetOf({ from: "2026-11-02", to: TODAY }, TODAY)).toBe("week");
    expect(presetOf({ from: "2026-11-01", to: TODAY }, TODAY)).toBe("month");
    expect(presetOf({ from: "2026-10-01", to: "2026-10-31" }, TODAY)).toBe(
      "custom",
    );
    // On a Monday the week is just today; on the 1st so is the month.
    expect(
      presetOf({ from: "2026-11-02", to: "2026-11-02" }, "2026-11-02"),
    ).toBe("today");
  });

  it("reads the URL: nothing → the default preset, a lone day → that day", () => {
    expect(resolveRange({ from: null, to: null }, TODAY, "month")).toEqual({
      from: "2026-11-01",
      to: TODAY,
    });
    expect(
      resolveRange({ from: null, to: "2026-10-10" }, TODAY, "month"),
    ).toEqual({ from: "2026-10-10", to: "2026-10-10" });
    expect(
      resolveRange({ from: "2026-10-10", to: null }, TODAY, "month"),
    ).toEqual({ from: "2026-10-10", to: TODAY });
  });

  it("counts days and moves by days on the calendar", () => {
    expect(daysIn(TODAY, TODAY)).toBe(1);
    expect(daysIn("2026-01-01", "2026-12-31")).toBe(365);
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });
});
