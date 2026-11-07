import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/navigation";

describe("safeNextPath", () => {
  it.each(["/dashboard", "/purchases?from=2026-11-01&to=2026-11-07", "/a/b#c"])(
    "keeps the same-origin path %s",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    null,
    undefined,
    "",
    "dashboard",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r//evil.com",
    "/ /evil.com",
    "/x\\..\\..\\evil.com",
  ])("refuses %j, which could leave the site", (next) => {
    expect(safeNextPath(next)).toBeNull();
  });
});
