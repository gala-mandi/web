import fs from "node:fs";
import {
  type BrowserContext,
  expect,
  type Page,
  type Route,
  test,
} from "@playwright/test";
import ur from "../messages/ur.json";
import { commodity, lookupItem } from "../src/features/commodities/test-data";
import {
  commodityList,
  dailySummary,
  outstanding,
  purchasesByCommodity,
  purchasesByDay,
  rateHistories,
  salesByDay,
} from "../src/features/dashboard/test-data";
import { statement } from "../src/features/ledger/test-data";
import {
  openBills,
  savedPayment,
  todayCashBook,
} from "../src/features/payments/test-data";
import {
  KISSAN,
  savedPurchase,
  ticketInput,
} from "../src/features/purchases/test-data";
import { todayRates, rate } from "../src/features/rates/test-data";
import { BEOPARI, beopariDetail } from "../src/features/sales/test-data";
import { shopStates } from "../src/features/subscription/test-data";
import { traderDetail } from "../src/features/traders/test-data";
import {
  API,
  owner,
  session,
  setRefreshCookie,
  shopSettings,
} from "./mock-api";

/**
 * Key flows on the Urdu interface (ticket 35): the whole layout mirrors,
 * the labels are Urdu, nothing overflows its box at 1440 and 390 px, and
 * printing follows the language. Every API call is mocked (`page.route`).
 */

const NOW = new Date("2026-11-06T07:00:00.000Z");
const SHOTS = process.env.URDU_SHOTS_DIR;

const gandum = commodity({ name: "Gandum", nameUr: "گندم" });
const purchase = savedPurchase(ticketInput, {
  trader: { id: KISSAN.id, name: "محمد رفیق" },
});
const payment = savedPayment();

const cors = (origin: string | null) => ({
  "access-control-allow-origin": origin ?? "*",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers":
    "authorization, content-type, accept, idempotency-key",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
});

/** One fake server for every screen of the shop panel. */
function answer(method: string, path: string, url: URL): unknown {
  if (method === "POST" && path === "/auth/refresh") {
    return session("token-ur");
  }
  if (method === "POST" && path === "/auth/login") return session("token-ur");
  if (method === "POST" && path === "/purchases") return purchase;
  if (path === "/auth/me") return owner;
  if (path === "/settings") return shopSettings;
  if (path === "/subscription") return shopStates.quiet;
  if (path === "/reports/daily-summary") return dailySummary;
  if (path === "/reports/purchases") {
    return url.searchParams.get("groupBy") === "commodity"
      ? purchasesByCommodity
      : purchasesByDay;
  }
  if (path === "/reports/sales") return salesByDay;
  if (path === "/reports/outstanding") return outstanding;
  if (path === "/payments/cash-book" || path === "/reports/cash-book") {
    return todayCashBook;
  }
  if (path === "/rates/today") {
    return todayRates([
      rate({
        commodityId: gandum.id,
        minRate: "3900.00",
        maxRate: "4100.00",
        avgRate: "4000.00",
      }),
    ]);
  }
  if (path === "/rates") {
    const data = rateHistories[url.searchParams.get("commodity") ?? ""] ?? [];
    return { data, meta: { page: 1, limit: 500, total: data.length } };
  }
  if (path === "/commodities/lookup") return { data: [lookupItem(gandum)] };
  if (path === "/commodities") {
    const data = [...commodityList, gandum];
    return { data, meta: { page: 1, limit: 100, total: data.length } };
  }
  if (path === "/traders/lookup") {
    const kissan = { ...KISSAN, name: "محمد رفیق" };
    const both = [kissan, { ...BEOPARI }];
    const type = url.searchParams.get("type");
    return { data: type ? both.filter((t) => t.type === type) : both };
  }
  if (path === `/traders/${BEOPARI.id}`) return beopariDetail();
  if (path.startsWith("/traders/")) {
    return traderDetail({ id: KISSAN.id, name: "محمد رفیق" });
  }
  if (path === "/traders") {
    return {
      data: [traderDetail({ id: KISSAN.id, name: "محمد رفیق" })],
      meta: { page: 1, limit: 20, total: 1 },
    };
  }
  if (path === "/purchases") {
    const row = { ...purchase, items: undefined, charges: undefined };
    return {
      data: url.searchParams.get("status") ? openBills : [row],
      meta: { page: 1, limit: 20, total: 1 },
    };
  }
  if (path.startsWith("/purchases/")) return purchase;
  if (path === "/sales")
    return { data: [], meta: { page: 1, limit: 20, total: 0 } };
  if (path === "/payments") {
    return { data: [payment], meta: { page: 1, limit: 20, total: 1 } };
  }
  if (path.startsWith("/payments/")) return payment;
  if (path.startsWith("/ledger/")) {
    return statement({ trader: { ...statement().trader, name: "محمد رفیق" } });
  }
  return null;
}

async function shopApi(page: Page) {
  await page.route(`${API}/**`, async (route: Route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = new URL(request.url());
    const body = answer(request.method(), url.pathname, url);
    await route.fulfill({
      status: body === null ? 404 : request.method() === "POST" ? 201 : 200,
      headers,
      contentType: "application/json",
      body: JSON.stringify(body ?? { statusCode: 404, message: "Not found" }),
    });
  });
}

/** This browser chose Urdu for the signed-in owner (see `src/i18n`). */
async function urduBrowser(context: BrowserContext, signedIn = true) {
  const cookie = (name: string, value: string) => ({
    name,
    value,
    domain: "localhost",
    path: "/",
  });
  await context.addCookies([
    cookie("gm_locale", "ur"),
    ...(signedIn
      ? [cookie("gm_uid", owner.id), cookie(`gm_locale_${owner.id}`, "ur")]
      : []),
  ]);
  if (signedIn) await setRefreshCookie(context);
}

async function prepare(page: Page, context: BrowserContext, signedIn = true) {
  await page.clock.setFixedTime(NOW);
  // Charts draw at once (no entry animation) for stable pictures.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await urduBrowser(context, signedIn);
  await shopApi(page);
  // react-to-print prints from an iframe: record what would print.
  await page.addInitScript(() => {
    type Printed = { lang: string; dir: string; text: string };
    const top = window.top as unknown as { printed?: Printed[] };
    if (window === window.top) top.printed = [];
    window.print = () => {
      const doc = document.querySelector<HTMLElement>(
        "[data-parchi], [data-report-document]",
      );
      top.printed?.push({
        lang: doc?.lang ?? "",
        dir: doc?.dir ?? "",
        text: doc?.textContent ?? "",
      });
    };
  });
}

async function shot(page: Page, name: string, fullPage = true) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  // Nastaliq loads late; wait so the picture shows the real glyphs.
  await page.evaluate(async () => {
    await document.fonts.ready;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.scrollIntoView({ block: "nearest" });
    }
  });
  if (fullPage) await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
}

async function expectRtl(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
}

/** No sideways scrolling: the page is never wider than the window. */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

/**
 * Text that doesn't fit its box (cut off or pushed over a neighbour):
 * buttons, badges, inputs, menu items, labels and table headers whose
 * content is wider or taller than the box, without a scrollbar of their own.
 */
async function overflowingText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selector = [
      "button:not([role=checkbox]):not([role=radio])",
      "a[data-slot=button]",
      "[data-slot=badge]",
      "input",
      "label",
      "th",
      "[data-sidebar=menu-button]",
      "[role=tab]",
    ].join(",");
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden") continue;
      // Text meant to be cut with "…" is fine.
      if (style.textOverflow === "ellipsis") continue;
      const wide = el.scrollWidth - el.clientWidth > 1;
      const tall =
        el.tagName !== "INPUT" &&
        style.overflowY !== "visible" &&
        el.scrollHeight - el.clientHeight > 1;
      if (wide || tall) {
        out.push(
          `${el.tagName.toLowerCase()} "${(el.textContent || (el as HTMLInputElement).value || "").trim().slice(0, 40)}" ${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight}`,
        );
      }
    }
    return out;
  });
}

async function checkPage(page: Page, name: string) {
  await expectRtl(page);
  await expectNoHorizontalOverflow(page);
  expect(await overflowingText(page), name).toEqual([]);
}

test.describe("Urdu interface", () => {
  test("sign in: the switch turns the screen to Urdu and back, then signs in", async ({
    page,
    context,
  }) => {
    await prepare(page, context, false);
    await context.clearCookies();
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await shot(page, "01-sign-in-en");

    await page.getByRole("button", { name: "اردو" }).click();
    await expectRtl(page);
    await expect(
      page.getByRole("heading", { name: ur.auth.login.title }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "اردو" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expectNoHorizontalOverflow(page);
    expect(await overflowingText(page)).toEqual([]);
    await shot(page, "02-sign-in-ur");

    // Signing in keeps Urdu (the last language of this browser).
    await page.getByLabel(ur.auth.login.identifierLabel).fill("03000000002");
    await page
      .getByLabel(ur.auth.login.passwordLabel, { exact: true })
      .fill("secret-123");
    await setRefreshCookie(context);
    await page
      .getByRole("button", { name: new RegExp(ur.auth.login.submit) })
      .click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expectRtl(page);
    await expect(
      page.getByRole("heading", { name: ur.panel.sections.dashboard.label }),
    ).toBeVisible();
  });

  test("dashboard mirrors: the menu on the right, Urdu labels, charts right to left", async ({
    page,
    context,
  }) => {
    await prepare(page, context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: ur.panel.sections.dashboard.label }),
    ).toBeVisible();
    await expect(page.getByTestId("sales-trend-chart")).toBeVisible();
    const menu = page.getByRole("navigation", { name: ur.panel.menuLabel });
    const box = await menu.boundingBox();
    expect(box!.x).toBeGreaterThan(1440 / 2);
    await expect(
      menu.getByRole("link", { name: ur.panel.sections.purchases.label }),
    ).toBeVisible();
    // Amounts read "… روپے", digits stay Western.
    await expect(page.getByTestId("sales-trend")).toContainText("روپے");
    await checkPage(page, "dashboard");
    await shot(page, "03-dashboard-ur-light");

    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await shot(page, "04-dashboard-ur-dark");
    await page.evaluate(() =>
      document.documentElement.classList.remove("dark"),
    );

    // The account menu switches back to English for this user.
    await page
      .getByRole("button", { name: new RegExp(ur.panel.userMenu.label) })
      .click();
    await expect(
      page.getByRole("menuitemradio", { name: "اردو" }),
    ).toHaveAttribute("aria-checked", "true");
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  test("new purchase with the keyboard, then its parchi prints in Urdu", async ({
    page,
    context,
  }) => {
    await prepare(page, context);
    await page.goto("/purchases/new");
    const f = ur.purchases.form;
    await expect(page.getByRole("heading", { name: f.newTitle })).toBeVisible();

    const kissan = page.getByRole("combobox", { name: f.trader });
    await kissan.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.type("محمد");
    await expect(page.getByRole("option", { name: /محمد رفیق/ })).toBeVisible();
    await shot(page, "07-combobox-open-ur", false);
    await page.keyboard.press("Enter");
    await expect(kissan).toContainText("محمد رفیق");

    const item = (label: string, n = 1) =>
      `${label}، ${f.itemLabel.replace("{n, number}", String(n))}`;
    // (The screenshot of the open picker can take focus; start at Notes.)
    await page.getByLabel(f.notes).focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("combobox", { name: item(f.commodity) }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.type("Gan");
    await expect(page.getByRole("option", { name: /Gandum/ })).toBeVisible();
    await page.keyboard.press("Enter");
    const commodityBox = page.getByRole("combobox", {
      name: item(f.commodity),
    });
    // The Urdu name leads on the Urdu interface.
    await expect(commodityBox).toHaveText(/گندم/);
    await expect(commodityBox).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.type("10");
    await page.keyboard.press("Enter");
    await expect(page.getByLabel(item(f.weight))).toBeFocused();
    await page.keyboard.type("25.25");
    await expect(page.getByTestId("purchase-item-0-kg")).toHaveText(
      "= 1,010 کلو (25 من 10 کلو)",
    );
    await page.keyboard.press("Enter");
    await expect(page.getByLabel(item(f.rate))).toHaveValue("4000");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("combobox", { name: item(f.commodity, 2) }),
    ).toBeFocused();
    await expect(page.getByTestId("purchase-net")).toHaveText(
      /^[\d,]+\.\d{2} روپے$/,
    );
    await expect(page.getByTestId("purchase-breakdown")).toContainText("روپے");
    await checkPage(page, "new purchase");
    await shot(page, "08-new-purchase-ur");

    await page.keyboard.press("Control+p");
    await expect(page).toHaveURL(new RegExp(`/purchases/${purchase.id}`));
    const parchi = page.locator("[data-parchi]");
    await expect(parchi).toHaveAttribute("lang", "ur");
    await expect(parchi).toHaveAttribute("dir", "rtl");
    await expect(parchi).toContainText("خرید کی پرچی");
    await expect(parchi).toContainText("روپے");
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { printed?: { lang: string }[] }).printed
              ?.length ?? 0,
        ),
      )
      .toBeGreaterThan(0);
    const printed = await page.evaluate(
      () =>
        (window as unknown as { printed: { lang: string; dir: string }[] })
          .printed[0],
    );
    expect(printed).toMatchObject({ lang: "ur", dir: "rtl" });
    await shot(page, "09-parchi-print-ur");
  });

  test("purchases list and new sale in Urdu", async ({ page, context }) => {
    await prepare(page, context);
    await page.goto("/purchases");
    await expect(
      page.getByRole("row").filter({ hasText: purchase.billNo }),
    ).toBeVisible();
    await checkPage(page, "purchases");
    await shot(page, "05-purchases-list-ur");

    await page.goto("/sales/new");
    await expect(
      page.getByRole("heading", { name: ur.sales.form.newTitle }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: ur.sales.form.buyer }).click();
    await page.getByRole("option", { name: /Shahid Traders/ }).click();
    await checkPage(page, "new sale");
    await shot(page, "10-sale-form-ur");
  });

  test("khata and payments in Urdu", async ({ page, context }) => {
    await prepare(page, context);
    await page.goto(`/ledger?trader=${KISSAN.id}`);
    await expect(
      page.getByText(ur.ledger.khata.openingBalance).first(),
    ).toBeVisible();
    await expect(page.getByText("بنام").first()).toBeVisible();
    await checkPage(page, "khata");
    await shot(page, "11-khata-ur");

    await page.goto("/payments");
    await expect(
      page.getByRole("heading", { name: ur.payments.cashBook.title }),
    ).toBeVisible();
    await checkPage(page, "cash book");
    await shot(page, "12-payments-ur");

    await page.goto("/payments/new?direction=paid");
    await expect(
      page.getByRole("heading", { name: ur.payments.form.newTitle.paid }),
    ).toBeVisible();
    await checkPage(page, "new payment");
  });

  test("a report prints in Urdu, right to left", async ({ page, context }) => {
    await prepare(page, context);
    await page.goto("/reports/purchases");
    await expect(
      page.getByRole("heading", { name: ur.reports.reports.purchases.title }),
    ).toBeVisible();
    await checkPage(page, "purchases report");
    await shot(page, "13-report-ur");
    await page.getByRole("button", { name: ur.reports.actions.print }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { printed?: unknown[] }).printed?.length ?? 0,
        ),
      )
      .toBeGreaterThan(0);
    const printed = await page.evaluate(
      () =>
        (
          window as unknown as {
            printed: { lang: string; dir: string; text: string }[];
          }
        ).printed[0],
    );
    expect(printed.lang).toBe("ur");
    expect(printed.dir).toBe("rtl");
    expect(printed.text).toContain("خریداری رپورٹ");
  });

  test("settings and a dialog in Urdu", async ({ page, context }) => {
    await prepare(page, context);
    await page.goto("/settings");
    await expect(
      page.getByText(ur.settings.fields.language, { exact: true }),
    ).toBeVisible();
    await checkPage(page, "settings");
    await shot(page, "14-settings-ur");

    await page.goto("/traders");
    await page.getByRole("button", { name: ur.traders.list.addButton }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    // The form sheet slides in from the end side: the left in Urdu.
    const box = await sheet.boundingBox();
    expect(box!.x).toBeLessThan(200);
    await shot(page, "06-dialog-ur", false);
  });

  test("phone width: the menu is a drawer from the right, nothing overflows", async ({
    page,
    context,
  }) => {
    await prepare(page, context);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      "/dashboard",
      "/purchases",
      "/purchases/new",
      "/payments",
    ]) {
      await page.goto(path);
      await expect(page.locator("main, #main-content").first()).toBeVisible();
      await expectRtl(page);
      await expectNoHorizontalOverflow(page);
    }
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: ur.panel.sections.dashboard.label }),
    ).toBeVisible();
    await shot(page, "15-phone-390-ur");
    await page
      .getByRole("button", { name: ur.panel.toggleSidebar })
      .first()
      .click();
    const drawer = page.locator("[data-mobile=true]");
    await expect(drawer).toBeVisible();
    const box = await drawer.boundingBox();
    expect(box!.x + box!.width).toBeGreaterThan(380);
    await shot(page, "16-phone-390-menu-ur", false);
  });
});
