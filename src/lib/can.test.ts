import { describe, expect, it } from "vitest";
import { can } from "./can";

describe("can", () => {
  it("lets the owner do everything in the shop", () => {
    expect(can("owner", "staff:manage")).toBe(true);
    expect(can("owner", "settings:manage")).toBe(true);
  });

  it("keeps staff and settings from the manager", () => {
    expect(can("manager", "staff:manage")).toBe(false);
    expect(can("manager", "settings:manage")).toBe(false);
    expect(can("manager", "reports:view")).toBe(true);
  });

  it("limits the operator to daily work", () => {
    expect(can("operator", "sales:view")).toBe(true);
    expect(can("operator", "khata:view")).toBe(false);
    expect(can("operator", "reports:view")).toBe(false);
  });

  it("allows nothing without a role", () => {
    expect(can(null, "dashboard:view")).toBe(false);
  });
});
