import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMaund,
  formatRelative,
} from "./format";

describe("format", () => {
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
});
