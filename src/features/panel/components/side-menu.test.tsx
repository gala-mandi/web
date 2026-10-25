import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SideMenu } from "./side-menu";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

function menuLabels() {
  const nav = screen.getByRole("navigation", { name: "Main menu" });
  return within(nav)
    .getAllByRole("listitem")
    .map((li) => li.textContent?.replace("Soon", "").trim());
}

describe("SideMenu", () => {
  it("shows every item to the owner", () => {
    render(<SideMenu role="owner" />);

    expect(menuLabels()).toEqual([
      "Dashboard",
      "Daily rates",
      "Purchases",
      "Sales",
      "Traders",
      "Khata",
      "Payments",
      "Reports",
      "Staff",
      "Settings",
    ]);
  });

  it("hides Staff and Settings from a manager", () => {
    render(<SideMenu role="manager" />);

    const labels = menuLabels();
    expect(labels).not.toContain("Staff");
    expect(labels).not.toContain("Settings");
    expect(labels).toContain("Reports");
    expect(labels).toHaveLength(8);
  });

  it("shows an operator only rates, purchases, sales and payments (plus the dashboard)", () => {
    render(<SideMenu role="operator" />);

    expect(menuLabels()).toEqual([
      "Dashboard",
      "Daily rates",
      "Purchases",
      "Sales",
      "Payments",
    ]);
  });

  it("shows nothing without a role", () => {
    render(<SideMenu role={null} />);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("links only pages that exist and marks the current one", () => {
    render(<SideMenu role="owner" />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/dashboard");
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByText("Staff").closest("[aria-disabled]"),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
