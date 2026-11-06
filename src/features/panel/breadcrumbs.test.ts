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
    expect(breadcrumbsFor("/ledger/42", owner).at(-1)).toEqual({
      label: "Ledger",
      href: null,
    });
    expect(breadcrumbsFor("/traders/a/b", owner).at(-1)).toEqual({
      label: "Traders",
      href: null,
    });
  });

  it("names the purchase pages below Purchases", () => {
    const last = (path: string) => breadcrumbsFor(path, owner).at(-1);
    expect(breadcrumbsFor("/purchases/new", owner)).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Purchases", href: "/purchases" },
      { label: "New purchase", href: null },
    ]);
    expect(last("/purchases/abc")).toEqual({ label: "Purchase", href: null });
    expect(last("/purchases/abc/edit")).toEqual({
      label: "Edit purchase",
      href: null,
    });
    expect(last("/purchases/abc/other")).toEqual({
      label: "Purchases",
      href: null,
    });
  });

  it("names the sale pages below Sales", () => {
    const last = (path: string) => breadcrumbsFor(path, owner).at(-1);
    expect(breadcrumbsFor("/sales/new", owner)).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Sales", href: "/sales" },
      { label: "New sale", href: null },
    ]);
    expect(last("/sales/abc")).toEqual({ label: "Sale", href: null });
    expect(last("/sales/abc/edit")).toEqual({ label: "Edit sale", href: null });
    expect(last("/sales/new/edit")).toEqual({ label: "Sales", href: null });
  });
});
