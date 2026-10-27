import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { api } from "@/lib/api";
import { hardRedirect } from "@/lib/navigation";
import { useSessionStore } from "@/stores/session";
import { fakeAdapter, httpError, ok, operator, owner } from "@/test/fake-api";
import { renderPanel, resetStores } from "@/test/render-panel";
import { refreshShopInfo, shopInfoKey } from "../hooks";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/lib/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/navigation")>()),
  hardRedirect: vi.fn(),
}));

const defaultAdapter = api.defaults.adapter;

function breadcrumbs() {
  return screen.getByRole("navigation", { name: "Breadcrumb" });
}

function openUserMenu() {
  fireEvent.keyDown(
    screen.getByRole("button", { name: /^Account menu: Haji Aslam/ }),
    { key: "Enter" },
  );
  return screen.getByRole("menu");
}

describe("PanelHeader", () => {
  let me: User;
  let fake: ReturnType<typeof fakeAdapter>;

  beforeEach(() => {
    pathname.current = "/dashboard";
    vi.mocked(hardRedirect).mockReset();
    me = owner;
    fake = fakeAdapter(async (config) =>
      config.url === "/auth/me" ? ok(config, me) : ok(config, "", 204),
    );
    api.defaults.adapter = fake.adapter;
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    resetStores();
  });

  describe("shop", () => {
    it("shows the shop name with initials when there is no logo", async () => {
      renderPanel();

      expect(await screen.findByTestId("shop-name")).toHaveTextContent(
        "Demo Mandi",
      );
      expect(screen.getByTestId("shop-initials")).toHaveTextContent("DM");
      expect(screen.queryByTestId("shop-logo")).toBeNull();
    });

    it("shows the shop logo when the tenant has one", async () => {
      me = {
        ...owner,
        tenant: { ...owner.tenant!, logoUrl: "https://cdn.example/logo.png" },
      };
      renderPanel();

      expect(await screen.findByTestId("shop-logo")).toHaveAttribute(
        "src",
        "https://cdn.example/logo.png",
      );
      expect(screen.queryByTestId("shop-initials")).toBeNull();
    });

    it("falls back to initials when the logo can't load", async () => {
      me = {
        ...owner,
        tenant: { ...owner.tenant!, logoUrl: "https://cdn.example/x.png" },
      };
      renderPanel();

      fireEvent.error(await screen.findByTestId("shop-logo"));

      expect(screen.getByTestId("shop-initials")).toHaveTextContent("DM");
    });

    it("updates name and logo after /auth/me changes, without a new login", async () => {
      const { client } = renderPanel();
      await waitFor(() =>
        expect(client.getQueryState(shopInfoKey())?.status).toBe("success"),
      );
      expect(screen.getByTestId("shop-name")).toHaveTextContent("Demo Mandi");

      // e.g. the owner saved new shop settings
      me = {
        ...owner,
        tenant: {
          ...owner.tenant!,
          name: "Aslam Traders",
          logoUrl: "https://cdn.example/new.png",
        },
      };
      await act(() => refreshShopInfo(client));

      await waitFor(() =>
        expect(screen.getByTestId("shop-name")).toHaveTextContent(
          "Aslam Traders",
        ),
      );
      expect(screen.getByTestId("shop-logo")).toHaveAttribute(
        "src",
        "https://cdn.example/new.png",
      );
      expect(useSessionStore.getState().accessToken).toBe("token-1");
      expect(fake.calls.filter((c) => c.url === "/auth/me")).toHaveLength(2);
    });
  });

  describe("breadcrumbs", () => {
    it("shows only the current page on the landing page", () => {
      renderPanel();

      const items = within(breadcrumbs()).getAllByRole("listitem");
      expect(items.map((li) => li.textContent)).toEqual(["Dashboard"]);
      expect(breadcrumbs().querySelector("a[href]")).toBeNull();
    });

    it("links back to the landing page from a section", () => {
      pathname.current = "/ledger";
      renderPanel();

      const nav = breadcrumbs();
      expect(
        within(nav).getByRole("link", { name: "Dashboard" }),
      ).toHaveAttribute("href", "/dashboard");
      expect(within(nav).getByText("Ledger")).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("starts from Daily rates for an operator", () => {
      me = operator;
      pathname.current = "/sales";
      renderPanel("page", operator);

      expect(
        within(breadcrumbs()).getByRole("link", { name: "Daily rates" }),
      ).toHaveAttribute("href", "/rates");
    });

    it("says page not found for an unknown URL", () => {
      pathname.current = "/no-such-page";
      renderPanel();

      expect(within(breadcrumbs()).getByText("Page not found")).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });

  describe("user menu", () => {
    it("shows the user's name and role", () => {
      renderPanel();

      expect(screen.getByTestId("user-name")).toHaveTextContent("Haji Aslam");
      expect(screen.getByTestId("user-role")).toHaveTextContent("Owner");

      const menu = openUserMenu();
      expect(menu).toHaveTextContent("Haji Aslam");
      expect(menu).toHaveTextContent("Owner · 03000000002");
      expect(
        within(menu)
          .getAllByRole("menuitem")
          .map((i) => i.textContent),
      ).toEqual(["Log out", "Log out of all devices"]);
    });

    it("Log out calls the API, clears the session and goes to login", async () => {
      renderPanel();

      fireEvent.click(
        within(openUserMenu()).getByRole("menuitem", { name: "Log out" }),
      );

      await waitFor(() => expect(hardRedirect).toHaveBeenCalledWith("/login"));
      expect(fake.calls.map((c) => c.url)).toContain("/auth/logout");
      expect(useSessionStore.getState().accessToken).toBeNull();
    });

    it("Log out of all devices calls the API, then goes to login", async () => {
      renderPanel();

      fireEvent.click(
        within(openUserMenu()).getByRole("menuitem", {
          name: "Log out of all devices",
        }),
      );

      await waitFor(() => expect(hardRedirect).toHaveBeenCalledWith("/login"));
      expect(fake.calls.map((c) => c.url)).toContain("/auth/logout-all");
    });

    it("shows a toast and stays signed in when log out of all devices fails", async () => {
      api.defaults.adapter = fakeAdapter(async (config) => {
        if (config.url === "/auth/me") return ok(config, owner);
        throw httpError(config, 500);
      }).adapter;
      renderPanel();

      fireEvent.click(
        within(openUserMenu()).getByRole("menuitem", {
          name: "Log out of all devices",
        }),
      );

      expect(
        await screen.findByText("Couldn’t log out of all devices. Try again."),
      ).toBeInTheDocument();
      expect(hardRedirect).not.toHaveBeenCalled();
      expect(useSessionStore.getState().accessToken).toBe("token-1");
    });
  });
});
