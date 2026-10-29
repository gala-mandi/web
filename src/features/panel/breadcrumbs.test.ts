import { describe, expect, it } from "vitest";
import { manager, owner } from "@/test/fake-api";
import { breadcrumbsFor } from "./breadcrumbs";

describe("breadcrumbsFor", () => {
  it("links a trader profile back to the Traders list", () => {
    expect(breadcrumbsFor("/traders/abc-123", owner)).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Traders", href: "/traders" },
      { label: "Trader profile", href: null },
    ]);
    expect(breadcrumbsFor("/traders/abc-123/", manager)).toHaveLength(3);
  });

  it("keeps the section as the last crumb on the list itself", () => {
    expect(breadcrumbsFor("/traders", owner)).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Traders", href: null },
    ]);
  });

  it("adds no detail crumb for sections without one or deeper paths", () => {
    expect(breadcrumbsFor("/sales/42", owner).at(-1)).toEqual({
      label: "Sales",
      href: null,
    });
    expect(breadcrumbsFor("/traders/a/b", owner).at(-1)).toEqual({
      label: "Traders",
      href: null,
    });
  });
});
