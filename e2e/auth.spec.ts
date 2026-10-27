import { expect, type Page, test } from "@playwright/test";
import {
  bearer,
  mockEndpoint,
  owner,
  rolePermissions,
  session,
  setRefreshCookie,
} from "./mock-api";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Phone number or email").fill("0300 0000002");
  await page.getByLabel("Password", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("auth", () => {
  test("login → dashboard", async ({ page, context }) => {
    const logins = await mockEndpoint(page, "POST", "/auth/login", async () => {
      await setRefreshCookie(context);
      return { status: 200, body: session("token-a") };
    });
    await mockEndpoint(page, "GET", "/auth/me", () => ({
      status: 200,
      body: owner,
    }));

    await signIn(page);

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("shop-name")).toHaveText("Demo Mandi");
    await expect(page.getByTestId("user-name")).toHaveText("Haji Aslam");
    await expect(page.getByTestId("user-role")).toHaveText("Owner");
    await expect(page.getByText("Welcome, Haji Aslam")).toBeVisible();
    expect(logins).toHaveLength(1);
    expect(logins[0].postDataJSON()).toEqual({
      identifier: "03000000002",
      password: "demo-password",
      rememberMe: true,
    });
  });

  test("wrong password shows the generic error", async ({ page }) => {
    await mockEndpoint(page, "POST", "/auth/login", () => ({
      status: 401,
      body: { statusCode: 401, message: "Invalid credentials" },
    }));

    await signIn(page);

    await expect(
      page.getByText("Phone number or password is incorrect"),
    ).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("expired access token is refreshed silently", async ({
    page,
    context,
  }) => {
    await mockEndpoint(page, "POST", "/auth/login", async () => {
      await setRefreshCookie(context);
      return { status: 200, body: session("expired-token") };
    });
    const refreshes = await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 200,
      body: session("fresh-token"),
    }));
    const meCalls = await mockEndpoint(page, "GET", "/auth/me", (request) =>
      bearer(request) === "fresh-token"
        ? { status: 200, body: owner }
        : { status: 401, body: { statusCode: 401, message: "Unauthorized" } },
    );

    await signIn(page);

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("Welcome, Haji Aslam")).toBeVisible();
    expect(refreshes).toHaveLength(1);
    expect(meCalls.map(bearer)).toEqual(["expired-token", "fresh-token"]);
  });

  test("reload restores the session from the refresh cookie", async ({
    page,
    context,
  }) => {
    await setRefreshCookie(context);
    const refreshes = await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 200,
      body: session("restored"),
    }));
    await mockEndpoint(page, "GET", "/auth/me", () => ({
      status: 200,
      body: owner,
    }));

    await page.goto("/dashboard");

    await expect(page.getByText("Welcome, Haji Aslam")).toBeVisible();
    expect(refreshes).toHaveLength(1);
  });

  test("refresh token expired → login with the session-expired message", async ({
    page,
    context,
  }) => {
    await setRefreshCookie(context);
    await mockEndpoint(page, "POST", "/auth/refresh", async () => {
      await context.clearCookies();
      return {
        status: 401,
        body: {
          statusCode: 401,
          message: "Session expired",
          code: "SESSION_EXPIRED",
        },
      };
    });

    await page.goto("/dashboard");

    await expect(page).toHaveURL(
      "/login?reason=session-expired&next=%2Fdashboard",
    );
    await expect(page.getByText("Your session has ended")).toBeVisible();
  });

  test("logout → back to login", async ({ page, context }) => {
    await setRefreshCookie(context);
    await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 200,
      body: session("token-a"),
    }));
    await mockEndpoint(page, "GET", "/auth/me", () => ({
      status: 200,
      body: owner,
    }));
    const logouts = await mockEndpoint(
      page,
      "POST",
      "/auth/logout",
      async () => {
        await context.clearCookies();
        return { status: 204 };
      },
    );

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Log out", exact: true }).click();

    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    expect(logouts).toHaveLength(1);
  });

  test("log out of all devices → back to login", async ({ page, context }) => {
    await setRefreshCookie(context);
    await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 200,
      body: session("token-a"),
    }));
    await mockEndpoint(page, "GET", "/auth/me", () => ({
      status: 200,
      body: owner,
    }));
    const calls = await mockEndpoint(
      page,
      "POST",
      "/auth/logout-all",
      async (request) => {
        await context.clearCookies();
        return bearer(request) === "token-a"
          ? { status: 204 }
          : { status: 401 };
      },
    );

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Account menu/ }).click();
    await page
      .getByRole("menuitem", { name: "Log out of all devices" })
      .click();

    await expect(page).toHaveURL("/login");
    expect(calls).toHaveLength(1);
  });

  test("protected route without the cookie redirects to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL("/login?next=%2Fdashboard");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("a signed-in operator opening /login lands on Daily rates", async ({
    page,
    context,
  }) => {
    const operator = {
      ...owner,
      role: "operator",
      name: "Bilal",
      permissions: rolePermissions.operator,
    };
    await setRefreshCookie(context);
    await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 200,
      body: session("token-a", operator),
    }));
    await mockEndpoint(page, "GET", "/auth/me", () => ({
      status: 200,
      body: operator,
    }));

    await page.goto("/login");

    await expect(page).toHaveURL("/rates");
    const menu = page.getByRole("navigation", { name: "Main menu" });
    await expect(menu.getByRole("listitem")).toHaveCount(4);
    await expect(menu.getByText("Staff")).toHaveCount(0);
  });
});
