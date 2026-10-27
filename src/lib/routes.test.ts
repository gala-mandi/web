import { describe, expect, it } from "vitest";
import { homePathFor } from "@/lib/auth-session";
import { manager, operator, owner } from "@/test/fake-api";
import { rolePermissions } from "@/test/permissions";
import {
  canOpenPath,
  isActivePath,
  landingPathFor,
  sectionOf,
  sectionsFor,
} from "./routes";

describe("landing page", () => {
  it("is the dashboard for owners and managers", () => {
    expect(landingPathFor(owner)).toBe("/dashboard");
    expect(landingPathFor(manager)).toBe("/dashboard");
  });

  it("is Daily rates for an operator, who has no dashboard", () => {
    expect(landingPathFor(operator)).toBe("/rates");
  });

  it("is the first menu page the permissions allow", () => {
    expect(landingPathFor({ permissions: ["sale.view", "ledger.view"] })).toBe(
      "/sales",
    );
  });

  it("falls back to the dashboard (403) without any section", () => {
    expect(landingPathFor(null)).toBe("/dashboard");
    expect(
      landingPathFor({ permissions: [...rolePermissions.super_admin] }),
    ).toBe("/dashboard");
  });
});

describe("homePathFor (after sign-in)", () => {
  it("uses ?next= when the user may open it", () => {
    expect(homePathFor(operator, "/sales?day=1")).toBe("/sales?day=1");
    expect(homePathFor(owner, "/settings")).toBe("/settings");
  });

  it("falls back to the landing page for a ?next= the user may not open", () => {
    expect(homePathFor(operator, "/settings")).toBe("/rates");
    expect(homePathFor(manager, "/staff")).toBe("/dashboard");
  });

  it("sends a user who must change the password there first", () => {
    expect(
      homePathFor({ ...operator, mustChangePassword: true }, "/sales"),
    ).toBe("/change-password");
  });
});

describe("sections", () => {
  it("gives each role its pages in menu order", () => {
    expect(sectionsFor(owner)).toHaveLength(11);
    expect(sectionsFor(manager)).not.toContain("staff");
    expect(sectionsFor(manager)).not.toContain("settings");
    expect(sectionsFor(operator)).toEqual([
      "rates",
      "purchases",
      "sales",
      "payments",
    ]);
  });

  it("finds the section of a path, including pages below it", () => {
    expect(sectionOf("/sales")).toBe("sales");
    expect(sectionOf("/sales/42?x=1")).toBe("sales");
    expect(sectionOf("/salesman")).toBeNull();
    expect(sectionOf("/change-password")).toBeNull();
    expect(isActivePath("/ledger/7", "/ledger")).toBe(true);
  });

  it("only blocks panel pages the user lacks the permission for", () => {
    expect(canOpenPath(operator, "/settings")).toBe(false);
    expect(canOpenPath(operator, "/dashboard")).toBe(false);
    expect(canOpenPath(operator, "/payments")).toBe(true);
    expect(canOpenPath(operator, "/change-password")).toBe(true);
  });
});
