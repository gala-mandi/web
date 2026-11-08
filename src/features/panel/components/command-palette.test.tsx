import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { api } from "@/lib/api";
import { fakeAdapter, ok, operator, owner } from "@/test/fake-api";
import { renderPanel, resetStores } from "@/test/render-panel";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  usePathname: () => "/rates",
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const defaultAdapter = api.defaults.adapter;

function signIn(user: User) {
  api.defaults.adapter = fakeAdapter(async (config) =>
    ok(config, user),
  ).adapter;
  return renderPanel("page", user);
}

function pressCtrlK(init: KeyboardEventInit = { ctrlKey: true }) {
  fireEvent.keyDown(window, { key: "k", ...init });
}

function palette() {
  return screen.getByRole("dialog", { name: "Go to a page" });
}

function pageOptions() {
  const group = within(palette()).getByRole("group", { name: "Pages" });
  return within(group)
    .getAllByRole("option")
    .map((o) => o.textContent);
}

describe("CommandPalette", () => {
  beforeEach(() => push.mockReset());

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    resetStores();
  });

  it("opens with Ctrl+K and with ⌘K, and closes with Esc", () => {
    signIn(owner);
    expect(screen.queryByRole("dialog")).toBeNull();

    pressCtrlK();
    expect(palette()).toBeInTheDocument();
    expect(within(palette()).getByRole("combobox")).toHaveFocus();

    fireEvent.keyDown(within(palette()).getByRole("combobox"), {
      key: "Escape",
    });
    expect(screen.queryByRole("dialog")).toBeNull();

    pressCtrlK({ metaKey: true });
    expect(palette()).toBeInTheDocument();
  });

  it("opens from the header button and gives focus back on close", async () => {
    signIn(owner);
    const button = screen.getByRole("button", { name: "Search pages" });

    button.focus();
    fireEvent.click(button);
    expect(palette()).toBeInTheDocument();

    fireEvent.keyDown(within(palette()).getByRole("combobox"), {
      key: "Escape",
    });
    await waitFor(() => expect(button).toHaveFocus());
  });

  it("lists every page for the owner", () => {
    signIn(owner);
    pressCtrlK();

    expect(pageOptions()).toHaveLength(11);
  });

  it("lists only the pages an operator may open", () => {
    signIn(operator);
    pressCtrlK();

    expect(pageOptions()).toEqual([
      "Dashboard",
      "Daily rates",
      "Purchases",
      "Sales",
      "Payments",
    ]);
  });

  it("filters by typing and opens the page with Enter", () => {
    signIn(operator);
    pressCtrlK();
    const input = within(palette()).getByRole("combobox");

    fireEvent.change(input, { target: { value: "sal" } });
    expect(pageOptions()).toEqual(["Sales"]);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(push).toHaveBeenCalledWith("/sales");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves with the arrow keys", () => {
    signIn(operator);
    pressCtrlK();
    const input = within(palette()).getByRole("combobox");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(push).toHaveBeenCalledWith("/rates");
  });

  it("navigates on click", () => {
    signIn(owner);
    pressCtrlK();

    fireEvent.click(within(palette()).getByRole("option", { name: "Ledger" }));

    expect(push).toHaveBeenCalledWith("/ledger");
  });

  it("finds a trader by name and opens the profile (owner)", async () => {
    api.defaults.adapter = fakeAdapter(async (config) =>
      config.url === "/traders/lookup"
        ? ok(config, {
            data: [
              {
                id: "t-9",
                type: "kissan",
                name: "Rafiq Ahmad",
                fatherName: null,
                phone: "03001112223",
                village: null,
              },
            ],
          })
        : ok(config, owner),
    ).adapter;
    renderPanel("page", owner);
    pressCtrlK();
    const input = within(palette()).getByRole("combobox");
    expect(
      within(palette()).getByRole("option", {
        name: "Type 2 letters to find a trader by name or phone",
      }),
    ).toHaveAttribute("aria-disabled", "true");

    fireEvent.change(input, { target: { value: "0300" } });
    const traders = within(palette()).getByRole("group", { name: "Traders" });
    fireEvent.click(
      await within(traders).findByRole("option", { name: /Rafiq Ahmad/ }),
    );

    expect(push).toHaveBeenCalledWith("/traders/t-9");
  });

  it("has no trader search for an operator (no profile or khata access)", () => {
    signIn(operator);
    pressCtrlK();

    expect(
      within(palette()).queryByRole("group", { name: "Traders" }),
    ).toBeNull();
  });
});
