import { describe, expect, it } from "vitest";
import { rate } from "./test-data";
import { trendSeries, trendStart, trendUnit } from "./trend";

describe("trendSeries", () => {
  it("a day without a rate is a gap (null), never zero", () => {
    const series = trendSeries(
      [
        rate({ rateDate: "2026-11-03", avgRate: "4100.00" }),
        rate({ rateDate: "2026-11-05", minRate: "4050.50", maxRate: "4300" }),
      ],
      "2026-11-02",
      "2026-11-06",
    );

    expect(series.map((p) => p.date)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
    expect(series.map((p) => p.band)).toEqual([
      null,
      [4000, 4200],
      null,
      [4050.5, 4300],
      null,
    ]);
    expect(series.map((p) => p.avg)).toEqual([null, 4100, null, null, null]);
    // The tooltip shows the server's strings.
    expect(series[3]).toMatchObject({
      minRate: "4050.50",
      maxRate: "4300",
      avgRate: null,
    });
  });

  it("periods end today and include it", () => {
    expect(trendStart("2026-11-06", 7)).toBe("2026-10-31");
    expect(
      trendSeries([], trendStart("2026-11-06", 30), "2026-11-06"),
    ).toHaveLength(30);
    expect(
      trendSeries([], trendStart("2026-11-06", 90), "2026-11-06"),
    ).toHaveLength(90);
  });

  it("the axis takes the newest rate's unit", () => {
    expect(trendUnit([])).toBe("maund");
    expect(trendUnit([rate(), rate({ rateUnit: "kg" })])).toBe("kg");
  });
});
