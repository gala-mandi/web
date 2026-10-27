import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  mockEndpoint,
  operator,
  owner,
  session,
  setRefreshCookie,
} from "./mock-api";

const ownerMenu = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Daily rates", path: "/rates" },
  { name: "Purchases", path: "/purchases" },
  { name: "Sales", path: "/sales" },
  { name: "Traders", path: "/traders" },
  { name: "Commodities", path: "/commodities" },
  { name: "Ledger", path: "/ledger" },
  { name: "Payments", path: "/payments" },
  { name: "Reports", path: "/reports" },
  { name: "Staff", path: "/staff" },
  { name: "Settings", path: "/settings" },
];

type ShopUser = typeof owner;

/** A user whose refresh cookie restores the session on load. */
async function signedIn(page: Page, context: BrowserContext, user: ShopUser) {
  await setRefreshCookie(context);
  await mockEndpoint(page, "POST", "/auth/refresh", () => ({
    status: 200,
    body: session("token-a", user),
  }));
  await mockEndpoint(page, "GET", "/auth/me", () => ({
    status: 200,
    body: user,
  }));
}

async function signIn(page: Page, context: BrowserContext, user: ShopUser) {
  // For full page loads after sign-in (`page.goto`).
  await mockEndpoint(page, "POST", "/auth/refresh", () => ({
    status: 200,
    body: session("token-b", user),
  }));
  await mockEndpoint(page, "POST", "/auth/login", async () => {
    await setRefreshCookie(context);
    return { status: 200, body: session("token-a", user) };
  });
  await mockEndpoint(page, "GET", "/auth/me", () => ({
    status: 200,
    body: user,
  }));
  await page.goto("/login");
  await page.getByLabel("Phone number or email").fill(user.phone);
  await page.getByLabel("Password", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: /sign in/i }).click();
}

const mainMenu = (page: Page) =>
  page.getByRole("navigation", { name: "Main menu" });

const pageHeading = (page: Page, name: string) =>
  page.getByRole("heading", { level: 1, name });

test.describe("shop panel layout", () => {
  test("owner: login → every menu item → logout", async ({ page, context }) => {
    const logouts = await mockEndpoint(
      page,
      "POST",
      "/auth/logout",
      async () => {
        await context.clearCookies();
        return { status: 204 };
      },
    );
    await signIn(page, context, owner);

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("shop-name")).toHaveText("Demo Mandi");
    await expect(mainMenu(page).getByRole("link")).toHaveCount(11);

    for (const item of ownerMenu) {
      await mainMenu(page).getByRole("link", { name: item.name }).click();
      await expect(page).toHaveURL(item.path);
      await expect(pageHeading(page, item.name)).toBeVisible();
      await expect(
        mainMenu(page).getByRole("link", { name: item.name }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        page
          .getByRole("navigation", { name: "Breadcrumb" })
          .getByText(item.name, { exact: true }),
      ).toBeVisible();
    }

    await page.getByRole("button", { name: /^Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Log out", exact: true }).click();

    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    expect(logouts).toHaveLength(1);
  });

  test("operator: 4 items, lands on Daily rates, /settings is 403 in the layout", async ({
    page,
    context,
  }) => {
    await signIn(page, context, operator);

    await expect(page).toHaveURL("/rates");
    await expect(pageHeading(page, "Daily rates")).toBeVisible();
    const links = mainMenu(page).getByRole("link");
    await expect(links).toHaveText([
      "Daily rates",
      "Purchases",
      "Sales",
      "Payments",
    ]);

    await page.goto("/settings");

    await expect(pageHeading(page, "You don’t have access")).toBeVisible();
    await expect(page.getByText("403")).toBeVisible();
    await expect(mainMenu(page).getByRole("link")).toHaveCount(4);
    await expect(page.getByTestId("shop-name")).toHaveText("Demo Mandi");

    await page.goto("/dashboard");
    await expect(pageHeading(page, "You don’t have access")).toBeVisible();

    await page.getByRole("link", { name: "Back to Daily rates" }).click();
    await expect(page).toHaveURL("/rates");
  });

  test("Ctrl+K palette opens pages from the keyboard", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, operator);
    await page.goto("/rates");
    await expect(pageHeading(page, "Daily rates")).toBeVisible();

    await page.keyboard.press("Control+k");
    const palette = page.getByRole("dialog", { name: "Go to a page" });
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("option")).toHaveText([
      "Daily rates",
      "Purchases",
      "Sales",
      "Payments",
      "Traders search comes with the Traders module",
    ]);

    await page.keyboard.type("pay");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL("/payments");
    await expect(palette).toBeHidden();
    await expect(pageHeading(page, "Payments")).toBeVisible();

    await page.getByRole("button", { name: "Search pages" }).click();
    await expect(palette).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Search pages" }),
    ).toBeFocused();
  });

  test("skip link jumps to the page content", async ({ page, context }) => {
    await signedIn(page, context, owner);
    await page.goto("/sales");
    await expect(pageHeading(page, "Sales")).toBeVisible();

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");

    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("unknown URL shows the 404 inside the layout", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);

    await page.goto("/no-such-page");

    await expect(pageHeading(page, "Page not found")).toBeVisible();
    await expect(mainMenu(page)).toBeVisible();
    await expect(page.getByTestId("user-name")).toHaveText("Haji Aslam");

    await page.getByRole("link", { name: "Back to Dashboard" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("suspended shop → every panel page goes to the Shop suspended screen", async ({
    page,
    context,
  }) => {
    await setRefreshCookie(context);
    await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 200,
      body: session("token-a", owner),
    }));
    await mockEndpoint(page, "GET", "/auth/me", () => ({
      status: 403,
      body: {
        statusCode: 403,
        message: "Shop suspended",
        code: "TENANT_SUSPENDED",
      },
    }));

    await page.goto("/sales");

    await expect(page).toHaveURL("/shop-suspended");
    await expect(page.getByText("Shop suspended").first()).toBeVisible();
  });

  test("suspended at refresh → Shop suspended screen", async ({
    page,
    context,
  }) => {
    await setRefreshCookie(context);
    await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 403,
      body: {
        statusCode: 403,
        message: "Shop suspended",
        code: "TENANT_SUSPENDED",
      },
    }));

    await page.goto("/ledger");

    await expect(page).toHaveURL("/shop-suspended");
  });

  test("desktop sidebar collapses to icons and stays collapsed", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    await page.goto("/dashboard");
    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar).toHaveAttribute("data-state", "expanded");

    await page.getByRole("button", { name: "Toggle menu" }).click();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");

    await page.reload();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("the menu opens as a drawer and navigates", async ({
      page,
      context,
    }) => {
      await signedIn(page, context, operator);
      await page.goto("/rates");
      await expect(pageHeading(page, "Daily rates")).toBeVisible();
      await expect(page.getByTestId("shop-name")).toHaveText("Demo Mandi");
      await expect(mainMenu(page)).toBeHidden();

      await page.getByRole("button", { name: "Toggle menu" }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      await expect(
        drawer.getByRole("navigation", { name: "Main menu" }).getByRole("link"),
      ).toHaveCount(4);
      await drawer.getByRole("link", { name: "Sales" }).click();

      await expect(page).toHaveURL("/sales");
      await expect(drawer).toBeHidden();
      await expect(pageHeading(page, "Sales")).toBeVisible();
    });
  });
});
