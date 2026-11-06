import {
  type BrowserContext,
  expect,
  type Page,
  type Request,
  test,
} from "@playwright/test";
import {
  commodityList,
  dailySummary,
  emptyShop,
  FROM,
  outstanding,
  purchasesByCommodity,
  purchasesByDay,
  rateHistories,
  salesByDay,
  TODAY,
} from "../src/features/dashboard/test-data";
import type {
  BookReport,
  DailySummary,
  OutstandingReport,
} from "../src/features/dashboard/types";
import { formatRs } from "../src/lib/format";
import {
  manager,
  mockEndpoint,
  operator,
  owner,
  session,
  setRefreshCookie,
} from "./mock-api";

/** 12:00 in Karachi on TODAY, so the dashboard's 30 days are FROM..TODAY. */
const NOW = new Date(`${TODAY}T07:00:00Z`);

interface ShopData {
  summary: DailySummary;
  purchases: BookReport;
  sales: BookReport;
  byCommodity: BookReport;
  outstanding: OutstandingReport;
}

const busyShop: ShopData = {
  summary: dailySummary,
  purchases: purchasesByDay,
  sales: salesByDay,
  byCommodity: purchasesByCommodity,
  outstanding,
};

const newShop: ShopData = {
  summary: emptyShop.summary,
  purchases: emptyShop.book,
  sales: emptyShop.book,
  byCommodity: emptyShop.byCommodity,
  outstanding: emptyShop.outstanding,
};

async function signedIn(page: Page, context: BrowserContext, user: object) {
  await page.clock.install({ time: NOW });
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

const params = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams);

/** The reports API of ticket 30, answered from `data()` on every call. */
async function mockReports(page: Page, data: () => ShopData) {
  const book = (kind: "purchases" | "sales") => (request: Request) => {
    const shop = data();
    const groupBy = params(request).groupBy;
    if (groupBy === "commodity") {
      return {
        status: 200,
        body: kind === "purchases" ? shop.byCommodity : emptyShop.byCommodity,
      };
    }
    return { status: 200, body: shop[kind] };
  };
  return {
    summary: await mockEndpoint(
      page,
      "GET",
      "/reports/daily-summary**",
      () => ({
        status: 200,
        body: data().summary,
      }),
    ),
    purchases: await mockEndpoint(
      page,
      "GET",
      "/reports/purchases**",
      book("purchases"),
    ),
    sales: await mockEndpoint(page, "GET", "/reports/sales**", book("sales")),
    outstanding: await mockEndpoint(
      page,
      "GET",
      "/reports/outstanding**",
      () => ({ status: 200, body: data().outstanding }),
    ),
    rates: await mockEndpoint(page, "GET", "/rates**", (request) => {
      const rows = rateHistories[params(request).commodity] ?? [];
      return {
        status: 200,
        body: { data: rows, meta: { total: rows.length, page: 1, limit: 100 } },
      };
    }),
  };
}

const tile = (page: Page, id: string) => page.locator(`[data-tile="${id}"]`);

test.describe("owner dashboard", () => {
  test("the tiles and lists match the daily summary and reports' totals", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const calls = await mockReports(page, () => busyShop);

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible();

    // KPI tiles = GET /reports/daily-summary, figure for figure.
    const expected = {
      purchases: dailySummary.purchases.netAmount,
      sales: dailySummary.sales.netAmount,
      commission: dailySummary.commission.total,
      cash: dailySummary.cash.closingCash,
    };
    for (const [id, amount] of Object.entries(expected)) {
      await expect(tile(page, id).locator("[data-amount]")).toHaveAttribute(
        "data-amount",
        amount,
      );
      await expect(tile(page, id)).toContainText(formatRs(amount));
    }
    await expect(tile(page, "purchases")).toContainText(
      `${dailySummary.purchases.bills} bills`,
    );

    // 30 days by day, both books; legend totals are the reports' totals.
    const range = { from: FROM, to: TODAY };
    expect(calls.purchases.map(params)).toContainEqual({
      ...range,
      groupBy: "day",
    });
    expect(calls.sales.map(params)).toContainEqual({
      ...range,
      groupBy: "day",
    });
    const trend = page.getByTestId("sales-trend");
    await expect(trend.locator('[data-legend="purchases"]')).toContainText(
      formatRs(purchasesByDay.totals.netAmount),
    );
    await expect(trend.locator('[data-legend="sales"]')).toContainText(
      formatRs(salesByDay.totals.netAmount),
    );
    await expect(trend.locator(".recharts-area-area").first()).toBeVisible();

    // Top 10 receivables and payables; totals cover every trader.
    expect(calls.outstanding.map(params)).toContainEqual({ limit: "10" });
    const receivable = page.getByTestId("outstanding-receivable");
    await expect(receivable).toContainText(
      formatRs(outstanding.receivable.total),
    );
    await expect(receivable).toContainText("Top 10 of 24 traders");
    await expect(receivable.getByRole("listitem")).toHaveCount(10);
    const payable = page.getByTestId("outstanding-payable");
    await expect(payable).toContainText(formatRs(outstanding.payable.total));
    await expect(payable.getByRole("listitem").first()).toContainText(
      "Haji Bashir Ahmad",
    );

    // Rates of the top 3 commodities by weight bought.
    const rates = page.getByTestId("commodity-rates");
    await expect(rates.getByRole("listitem")).toHaveCount(3);
    await expect(rates.getByRole("listitem").first()).toContainText("Gandum");
    expect(calls.rates.map((r) => params(r).commodity)).toEqual(
      expect.arrayContaining([
        purchasesByCommodity.rows[2].key,
        purchasesByCommodity.rows[0].key,
        purchasesByCommodity.rows[3].key,
      ]),
    );
  });

  test("hovering the 30-day chart shows the day's amounts and bills", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, manager);
    await mockReports(page, () => busyShop);
    await page.goto("/dashboard");

    const chart = page.getByTestId("sales-trend-chart");
    await expect(chart.locator(".recharts-area-area").first()).toBeVisible();
    const box = (await chart.boundingBox())!;
    // The last day sits at the right edge of the plot.
    await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);

    const today = purchasesByDay.rows.at(-1)!;
    const tooltip = chart.locator(".recharts-tooltip-wrapper");
    await expect(tooltip).toContainText("6 Nov 2026");
    await expect(tooltip).toContainText(formatRs(today.netAmount));
    await expect(tooltip).toContainText(`${today.bills} bills`);
  });

  test("refreshes itself every 3 minutes", async ({ page, context }) => {
    await signedIn(page, context, owner);
    let data = busyShop;
    const calls = await mockReports(page, () => data);
    await page.goto("/dashboard");
    await expect(tile(page, "cash")).toContainText("Rs 297,900.00");
    const before = calls.summary.length;

    data = {
      ...busyShop,
      summary: {
        ...dailySummary,
        cash: { ...dailySummary.cash, closingCash: "312450.00" },
      },
    };
    await page.clock.fastForward("03:01");

    await expect(tile(page, "cash")).toContainText("Rs 312,450.00");
    expect(calls.summary.length).toBeGreaterThan(before);
  });

  test("a new shop with no data gets a helpful empty state", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    await mockReports(page, () => newShop);
    await page.goto("/dashboard");

    const empty = page.getByTestId("dashboard-empty");
    await expect(
      empty.getByRole("heading", { name: "Your dashboard is ready" }),
    ).toBeVisible();
    await expect(empty.getByRole("link")).toHaveText([
      "Set today’s rates",
      "Add your first purchase",
      "Add your first sale",
    ]);
    await expect(page.locator("[data-tile]")).toHaveCount(0);

    await empty.getByRole("link", { name: "Set today’s rates" }).click();
    await expect(page).toHaveURL("/rates");
  });

  test.describe("phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("stacks without scrolling sideways", async ({ page, context }) => {
      await signedIn(page, context, owner);
      await mockReports(page, () => busyShop);
      await page.goto("/dashboard");
      await expect(tile(page, "cash")).toContainText("Rs 297,900.00");
      await expect(
        page.getByTestId("outstanding-payable").getByRole("listitem"),
      ).toHaveCount(10);

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});

test.describe("operator dashboard", () => {
  test("is simpler and never calls the reports API", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, operator);
    const reports = await mockEndpoint(page, "GET", "/reports/**", () => ({
      status: 403,
      body: { statusCode: 403, message: "Forbidden" },
    }));
    const lists: Request[][] = [];
    for (const path of ["/purchases**", "/sales**"]) {
      lists.push(
        await mockEndpoint(page, "GET", path, (request) => ({
          status: 200,
          body: {
            data: [],
            meta: {
              total: request.url().includes("/purchases") ? 12 : 9,
              page: 1,
              limit: 1,
            },
          },
        })),
      );
    }
    await mockEndpoint(page, "GET", "/rates/today", () => ({
      status: 200,
      body: {
        date: TODAY,
        data: dailySummary.rates,
        yesterday: { date: "2026-11-05", data: [] },
      },
    }));
    await mockEndpoint(page, "GET", "/commodities**", () => ({
      status: 200,
      body: {
        data: commodityList,
        meta: { total: commodityList.length, page: 1, limit: 100 },
      },
    }));

    await page.goto("/dashboard");

    await expect(tile(page, "purchases-today")).toContainText("12");
    await expect(tile(page, "sales-today")).toContainText("9");
    const rates = page.getByTestId("today-rates");
    await expect(rates.getByRole("listitem")).toHaveCount(3);
    await expect(rates).toContainText("Gandum");
    await expect(page.locator('[data-tile="cash"]')).toHaveCount(0);
    await expect(page.getByText("Top receivables")).toHaveCount(0);

    expect(reports).toHaveLength(0);
    // Counts of today's posted bills only (one row per page).
    expect(lists.flat().map(params)).toContainEqual({
      page: "1",
      limit: "1",
      from: TODAY,
      to: TODAY,
      status: "posted",
    });
  });
});
