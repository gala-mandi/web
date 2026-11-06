import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { mockEndpoint, owner, session, setRefreshCookie } from "./mock-api";

/**
 * Plan banner and read-only mode with `GET /subscription` mocked in each of
 * its states. Set `SHOTS=<dir>` to keep screenshots for a visual check.
 */

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
}).format(new Date());
const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const trial = {
  id: "p-trial",
  name: "Trial",
  maxUsers: 3,
  maxBranches: 1,
  priceMonthly: "0.00",
};
const basic = {
  id: "p-basic",
  name: "Basic",
  maxUsers: 5,
  maxBranches: 1,
  priceMonthly: "2500.00",
};

function shopState(
  state: "active" | "grace" | "read_only",
  plan: typeof trial,
  endsIn: number,
) {
  const endsOn = addDays(today, endsIn);
  const graceEndsOn = addDays(endsOn, 7);
  const left = (day: string) =>
    Math.max(0, Math.round((Date.parse(day) - Date.parse(today)) / 86_400_000));
  return {
    today,
    state,
    subscription: {
      id: "s1",
      plan,
      startsOn: addDays(endsOn, -14),
      endsOn,
      graceDays: 7,
      graceEndsOn,
      status: state === "active" ? "active" : "expired",
      state,
      daysLeft: left(endsOn),
      graceDaysLeft: left(graceEndsOn),
      usersUsed: 3,
    },
  };
}

const states = {
  trial: shopState("active", trial, 9),
  expiring: shopState("active", basic, 3),
  grace: shopState("grace", basic, -3),
  readOnly: shopState("read_only", trial, -10),
};

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${process.env.SHOTS}/${name}.png` });
}

async function shop(
  page: Page,
  context: BrowserContext,
  state: (typeof states)[keyof typeof states],
) {
  await setRefreshCookie(context);
  await mockEndpoint(page, "POST", "/auth/refresh", () => ({
    status: 200,
    body: session("token-a", owner),
  }));
  await mockEndpoint(page, "GET", "/auth/me", () => ({
    status: 200,
    body: owner,
  }));
  await mockEndpoint(page, "GET", "/subscription", () => ({
    status: 200,
    body: state,
  }));
  await mockEndpoint(page, "GET", "/traders**", () => ({
    status: 200,
    body: { data: [], meta: { page: 1, limit: 20, total: 0 } },
  }));
}

test.describe("plan banner", () => {
  test("trial: days left, hidden for the rest of the day", async ({
    page,
    context,
  }) => {
    await shop(page, context, states.trial);
    await page.goto("/traders");
    const banner = page.getByTestId("subscription-banner");
    await expect(banner).toContainText("Free trial: 9 days left");
    await shot(page, "web-banner-trial");

    await banner.getByRole("button", { name: "Hide for today" }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Traders" }),
    ).toBeVisible();
    await expect(page.getByTestId("subscription-banner")).toBeHidden();
  });

  test("expiring within 7 days", async ({ page, context }) => {
    await shop(page, context, states.expiring);
    await page.goto("/traders");
    await expect(page.getByTestId("subscription-banner")).toContainText(
      "Your Basic plan ends in 3 days",
    );
    await shot(page, "web-banner-expiring");
  });

  test("grace: warned, can't hide it, everything still works", async ({
    page,
    context,
  }) => {
    await shop(page, context, states.grace);
    await page.goto("/traders");
    const banner = page.getByTestId("subscription-banner");
    await expect(banner).toContainText("Full access for 4 more days");
    await expect(
      banner.getByRole("button", { name: "Hide for today" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Add trader" }).first(),
    ).toBeVisible();
    await shot(page, "web-banner-grace");
  });
});

test.describe("read-only mode", () => {
  test("banner, no create button, new-purchase page shows screen 4.1", async ({
    page,
    context,
  }) => {
    await shop(page, context, states.readOnly);
    await page.goto("/traders");
    await expect(page.getByTestId("subscription-banner")).toContainText(
      "The shop is read-only",
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Traders" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Add trader" })).toHaveCount(
      0,
    );
    await shot(page, "web-banner-read-only");

    await page.goto("/purchases/new");
    const notice = page.getByTestId("read-only-notice");
    await expect(notice).toContainText("Demo Mandi is read-only");
    await expect(notice).toContainText("You can still view and print");
    await shot(page, "web-read-only-notice");
  });

  test("a write the server refuses shows the friendly toast", async ({
    page,
    context,
  }) => {
    // The plan ran out while the page was open: the banner still says grace.
    await shop(page, context, states.grace);
    await mockEndpoint(page, "POST", "/traders", () => ({
      status: 403,
      body: {
        statusCode: 403,
        code: "SUBSCRIPTION_READ_ONLY",
        message: "This shop's plan has ended.",
      },
    }));
    await page.goto("/traders");
    await page.getByRole("button", { name: "Add trader" }).first().click();
    const sheet = page.getByRole("dialog", { name: "Add trader" });
    await sheet.getByLabel(/^Name/).fill("Haji Aslam");
    await sheet.getByRole("button", { name: "Add trader" }).click();
    await expect(
      page.getByText(/the shop is read-only\. You can view and print/),
    ).toBeVisible();
  });

  test("phone width: banner wraps, no sideways scroll", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await shop(page, context, states.readOnly);
    await page.goto("/traders");
    await expect(page.getByTestId("subscription-banner")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await shot(page, "web-banner-read-only-390");
  });
});

test("staff invite: plan full shows the upgrade message", async ({
  page,
  context,
}) => {
  await shop(page, context, {
    ...states.trial,
    subscription: { ...states.trial.subscription, usersUsed: 3 },
  });
  await mockEndpoint(page, "GET", "/staff", () => ({
    status: 200,
    body: {
      data: [
        {
          id: "u1",
          name: owner.name,
          phone: owner.phone,
          email: null,
          role: "owner",
          isActive: true,
          lastLoginAt: null,
          mustChangePassword: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          isYou: true,
        },
      ],
    },
  }));
  await mockEndpoint(page, "GET", "/staff/invitations", () => ({
    status: 200,
    body: { data: [] },
  }));
  await mockEndpoint(page, "POST", "/staff/invitations", () => ({
    status: 403,
    body: {
      statusCode: 403,
      code: "PLAN_USER_LIMIT",
      message: "Your plan allows 3 users. Upgrade your plan to add more staff.",
    },
  }));

  await page.goto("/staff");
  await expect(page.getByTestId("plan-usage")).toContainText(
    "3 of 3 users on your Trial plan",
  );
  await page.getByRole("button", { name: "Invite staff" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Phone number").fill("0301 1234567");
  await dialog.getByRole("button", { name: "Send invite" }).click();
  await expect(dialog.getByTestId("plan-limit-alert")).toContainText(
    "Your Trial plan allows 3 users",
  );
  await shot(page, "web-invite-plan-limit");
});
