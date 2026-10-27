import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { api } from "@/lib/api";
import { useUiStore } from "@/stores/ui";
import { fakeAdapter, manager, ok, operator, owner } from "@/test/fake-api";
import { media } from "@/test/media";
import { rolePermissions } from "@/test/permissions";
import { renderPanel, resetStores } from "@/test/render-panel";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const defaultAdapter = api.defaults.adapter;

function mainMenu() {
  return screen.getByRole("navigation", { name: "Main menu" });
}

function menuLinks() {
  return within(mainMenu())
    .queryAllByRole("link")
    .map((l) => [l.textContent, l.getAttribute("href")]);
}

/** /auth/me answers with the same user the session has. */
function signIn(user: User) {
  api.defaults.adapter = fakeAdapter(async (config) =>
    ok(config, user),
  ).adapter;
  return renderPanel("page", user);
}

describe("AppSidebar", () => {
  beforeEach(() => {
    pathname.current = "/dashboard";
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    resetStores();
  });

  it("shows the owner all 11 items, each linked to its page", () => {
    signIn(owner);

    expect(menuLinks()).toEqual([
      ["Dashboard", "/dashboard"],
      ["Daily rates", "/rates"],
      ["Purchases", "/purchases"],
      ["Sales", "/sales"],
      ["Traders", "/traders"],
      ["Commodities", "/commodities"],
      ["Ledger", "/ledger"],
      ["Payments", "/payments"],
      ["Reports", "/reports"],
      ["Staff", "/staff"],
      ["Settings", "/settings"],
    ]);
  });

  it("hides Staff and Settings from a manager (9 items)", () => {
    signIn(manager);

    const labels = menuLinks().map(([label]) => label);
    expect(labels).toHaveLength(9);
    expect(labels).not.toContain("Staff");
    expect(labels).not.toContain("Settings");
  });

  it("shows an operator only Daily rates, Purchases, Sales and Payments", () => {
    pathname.current = "/rates";
    signIn(operator);

    expect(menuLinks()).toEqual([
      ["Daily rates", "/rates"],
      ["Purchases", "/purchases"],
      ["Sales", "/sales"],
      ["Payments", "/payments"],
    ]);
  });

  it("follows the server's permissions, not the role", () => {
    signIn({
      ...operator,
      permissions: ["report.view", "trader.view", "commodity.manage"],
    });

    expect(menuLinks().map(([label]) => label)).toEqual([
      "Dashboard",
      "Commodities",
      "Reports",
    ]);
  });

  it("shows no items to a super admin (no shop permissions)", () => {
    signIn({
      ...owner,
      role: "super_admin",
      permissions: [...rolePermissions.super_admin],
    });

    expect(within(mainMenu()).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("highlights the item of the current page (and pages below it)", () => {
    pathname.current = "/sales/42";
    signIn(owner);

    const sales = within(mainMenu()).getByRole("link", { name: "Sales" });
    expect(sales).toHaveAttribute("aria-current", "page");
    expect(sales).toHaveAttribute("data-active", "true");
    const dashboard = within(mainMenu()).getByRole("link", {
      name: "Dashboard",
    });
    expect(dashboard).not.toHaveAttribute("aria-current");
  });

  it("links the brand to the user's landing page", () => {
    signIn(operator);

    expect(
      screen.getByRole("link", { name: "Galla Mandi — go to Daily rates" }),
    ).toHaveAttribute("href", "/rates");
  });

  it("collapses to icons and expands again, remembering the choice", () => {
    signIn(owner);
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    const toggle = screen.getByRole("button", { name: "Toggle menu" });

    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);

    expect(sidebar).toHaveAttribute("data-state", "collapsed");
    expect(sidebar).toHaveAttribute("data-collapsible", "icon");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    expect(localStorage.getItem("gm-web-ui")).toContain('"sidebarOpen":false');

    fireEvent.click(toggle);
    expect(sidebar).toHaveAttribute("data-state", "expanded");
  });

  it("opens as a drawer on mobile and closes after picking a page", () => {
    media.mobile = true;
    signIn(operator);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));

    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getAllByRole("link")).toHaveLength(5); // brand + 4
    fireEvent.click(within(drawer).getByRole("link", { name: "Sales" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has a skip link to the page content", () => {
    signIn(owner);

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveAttribute("href", "#main-content");
    expect(document.getElementById("main-content")).toHaveTextContent("page");
  });
});
