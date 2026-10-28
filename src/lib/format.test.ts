import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRelative } from "./format";

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
});
