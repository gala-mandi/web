import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatDate,
  formatDateTime,
  formatKg,
  formatMaund,
  formatRelative,
  formatRs,
  karachiToday,
} from "./format";

describe("format", () => {
  it("gives today's date in Karachi as YYYY-MM-DD", () => {
    expect(karachiToday(new Date("2026-11-05T19:30:00.000Z"))).toBe(
      "2026-11-06",
    );
    expect(karachiToday(new Date("2026-11-05T18:59:00.000Z"))).toBe(
      "2026-11-05",
    );
  });

  it("shows dates in Pakistan time", () => {
    // 20:00 UTC is already the next day in Karachi (UTC+5).
    expect(formatDate("2026-10-27T20:00:00.000Z")).toBe("28 Oct 2026");
    expect(formatDateTime("2026-10-27T10:30:00.000Z")).toMatch(
      /^27 Oct 2026.*3:30/i,
    );
  });

  it("says how far away a time is", () => {
    const now = Date.parse("2026-10-28T10:00:00.000Z");
    expect(formatRelative("2026-10-30T10:00:00.000Z", now)).toBe("in 2 days");
    expect(formatRelative("2026-10-28T07:00:00.000Z", now)).toBe("3 hours ago");
    expect(formatRelative("2026-10-28T10:00:20.000Z", now)).toBe("this minute");
  });

  it("returns an empty string for a bad date", () => {
    expect(formatDate("nope")).toBe("");
    expect(formatRelative("nope")).toBe("");
  });

  describe("formatMaund", () => {
    it("shows kg as maund + kg with 40 kg to the maund", () => {
      expect(formatMaund("495", "40")).toBe("12 mn 15 kg");
      expect(formatMaund("1000", "40")).toBe("25 mn");
      expect(formatMaund("15", "40")).toBe("15 kg");
      expect(formatMaund("40", "40")).toBe("1 mn");
      expect(formatMaund("0", "40")).toBe("0 kg");
    });

    it("uses 40 kg when no maund size is given", () => {
      expect(formatMaund("495")).toBe("12 mn 15 kg");
      expect(formatMaund(495)).toBe("12 mn 15 kg");
    });

    it("reads the server's numeric(12,3) strings", () => {
      expect(formatMaund("495.000", "40.000")).toBe("12 mn 15 kg");
      expect(formatMaund("52.250", "40.000")).toBe("1 mn 12.25 kg");
      expect(formatMaund("0.5", "40")).toBe("0.5 kg");
      expect(formatMaund("100000", "40")).toBe("2,500 mn");
    });

    it("uses the shop's own kg per maund, without float drift", () => {
      expect(formatMaund("1000", "37.324")).toBe("26 mn 29.576 kg");
      expect(formatMaund("100", "50")).toBe("2 mn");
      expect(formatMaund("0.3", "0.1")).toBe("3 mn");
    });

    it("returns an empty string for a bad weight or maund size", () => {
      expect(formatMaund("abc", "40")).toBe("");
      expect(formatMaund("", "40")).toBe("");
      expect(formatMaund("-5", "40")).toBe("");
      expect(formatMaund("1e3", "40")).toBe("");
      expect(formatMaund("100", "0")).toBe("");
      expect(formatMaund("100", "0.000")).toBe("");
      expect(formatMaund("100", "")).toBe("");
      expect(formatMaund("100", "forty")).toBe("");
    });
  });

  describe("formatKg", () => {
    it("drops trailing zeros and groups thousands, without rounding", () => {
      expect(formatKg("100.000")).toBe("100 kg");
      expect(formatKg("1250.500")).toBe("1,250.5 kg");
      expect(formatKg("0.125")).toBe("0.125 kg");
      expect(formatKg("40.1259")).toBe("40.125 kg");
      expect(formatKg("007")).toBe("7 kg");
    });

    it("returns an empty string for anything else", () => {
      expect(formatKg(null)).toBe("");
      expect(formatKg("")).toBe("");
      expect(formatKg("-5")).toBe("");
      expect(formatKg("abc")).toBe("");
    });
  });

  describe("formatRs", () => {
    it("shows rupees with thousands separators and 2 decimals", () => {
      expect(formatRs("50000.00")).toBe("Rs 50,000.00");
      expect(formatRs("50000")).toBe("Rs 50,000.00");
      expect(formatRs("1234567.5")).toBe("Rs 1,234,567.50");
      expect(formatRs("999")).toBe("Rs 999.00");
      expect(formatRs("0")).toBe("Rs 0.00");
      expect(formatRs("0.05")).toBe("Rs 0.05");
    });

    it("keeps big amounts exact (no float maths)", () => {
      expect(formatRs("999999999999.99")).toBe("Rs 999,999,999,999.99");
      expect(formatRs("90071992547409931.01")).toBe(
        "Rs 90,071,992,547,409,931.01",
      );
      // Cut, never rounded.
      expect(formatRs("10.999")).toBe("Rs 10.99");
      expect(formatRs("007.1")).toBe("Rs 7.10");
    });

    it("puts the minus before Rs, but not on zero", () => {
      expect(formatRs("-50000.00")).toBe("-Rs 50,000.00");
      expect(formatRs("-0.00")).toBe("Rs 0.00");
    });

    it("returns an empty string for anything else", () => {
      expect(formatRs("")).toBe("");
      expect(formatRs(null)).toBe("");
      expect(formatRs(undefined)).toBe("");
      expect(formatRs("abc")).toBe("");
      expect(formatRs("1e5")).toBe("");
      expect(formatRs("1,000")).toBe("");
      expect(formatRs(".5")).toBe("");
    });
  });
});

describe("format in Urdu", () => {
  it("puts روپے after the amount, Western digits, no float maths", () => {
    expect(formatRs("50000.5", "ur")).toBe("50,000.50 روپے");
    expect(formatRs("-1200", "ur")).toBe("-1,200.00 روپے");
    expect(formatRs("-0.00", "ur")).toBe("0.00 روپے");
    expect(formatRs("999999999999.99", "ur")).toBe("999,999,999,999.99 روپے");
    expect(formatRs("abc", "ur")).toBe("");
  });

  it("shows weights as من and کلو", () => {
    expect(formatMaund("495", "40", "ur")).toBe("12 من 15 کلو");
    expect(formatMaund("1000", "40", "ur")).toBe("25 من");
    expect(formatMaund("15", "40", "ur")).toBe("15 کلو");
    expect(formatKg("1250.500", "ur")).toBe("1,250.5 کلو");
  });

  it("shows dates with Urdu month names in Pakistan time, Western digits", () => {
    expect(formatDate("2026-10-27T20:00:00.000Z", "ur")).toBe(
      "28 اکتوبر، 2026",
    );
    // The Latin clock is isolated left to right inside the Urdu text.
    expect(formatDateTime("2026-10-27T10:30:00.000Z", "ur")).toBe(
      "27 اکتوبر، 2026، \u20663:30 PM\u2069",
    );
    const now = Date.parse("2026-10-28T10:00:00.000Z");
    expect(formatRelative("2026-10-28T07:00:00.000Z", now, "ur")).toBe(
      "3 گھنٹے پہلے",
    );
  });

  it("groups counts for the language", () => {
    expect(formatCount(1250, "en")).toBe("1,250");
    expect(formatCount(1250, "ur")).toBe("1,250");
  });

  it("keeps English as the default", () => {
    expect(formatRs("1200")).toBe("Rs 1,200.00");
    expect(formatMaund("495")).toBe("12 mn 15 kg");
  });
});
