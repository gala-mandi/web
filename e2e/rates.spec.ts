import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  manager,
  mockEndpoint,
  operator,
  session,
  setRefreshCookie,
  shopSettings,
} from "./mock-api";

const TODAY = "2026-11-06";
const YESTERDAY = "2026-11-05";

interface Rate {
  id: string;
  commodityId: string;
  rateDate: string;
  minRate: string;
  maxRate: string;
  avgRate: string | null;
  rateUnit: "maund" | "kg";
  createdAt: string;
  updatedAt: string;
}

const commodity = (id: string, name: string, nameUr: string) => ({
  id,
  name,
  nameUr,
  category: "grain",
  defaultUnit: "maund",
  bagWeightKg: null,
  commissionPct: null,
  marketFeePct: null,
  labourPerBag: null,
  isActive: true,
  createdAt: "2026-10-01T05:00:00.000Z",
  updatedAt: "2026-10-01T05:00:00.000Z",
});

// Name order, as the server lists them.
const commodities = [
  commodity("11111111-1111-4111-8111-111111111111", "Chawal", "چاول"),
  commodity("22222222-2222-4222-8222-222222222222", "Gandum", "گندم"),
  commodity("33333333-3333-4333-8333-333333333333", "Makai", "مکئی"),
];

async function signedIn(page: Page, context: BrowserContext, user: object) {
  await setRefreshCookie(context);
  await mockEndpoint(page, "POST", "/auth/refresh", () => ({
    status: 200,
    body: session("token-a", user),
  }));
  await mockEndpoint(page, "GET", "/auth/me", () => ({
    status: 200,
    body: user,
  }));
  await mockEndpoint(page, "GET", "/settings", () => ({
    status: 200,
    body: shopSettings,
  }));
}

/** "4000" → "4000.00", like the server's numeric(14,2) columns. */
function money(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

/**
 * A fake rates API that keeps saved rates across requests (and reloads), so
 * a reload shows what the server stored.
 */
async function ratesApi(page: Page, yesterday: Rate[] = []) {
  const rates: Rate[] = [...yesterday];
  const ofDay = (date: string) =>
    commodities.flatMap((c) =>
      rates.filter((r) => r.rateDate === date && r.commodityId === c.id),
    );

  await mockEndpoint(page, "GET", "/commodities**", (request) => {
    const url = new URL(request.url());
    return {
      status: 200,
      body: {
        data: commodities,
        meta: {
          page: Number(url.searchParams.get("page") ?? 1),
          limit: Number(url.searchParams.get("limit") ?? 20),
          total: commodities.length,
        },
      },
    };
  });

  await mockEndpoint(page, "GET", "/rates**", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/rates/today") {
      return {
        status: 200,
        body: {
          date: TODAY,
          data: ofDay(TODAY),
          yesterday: { date: YESTERDAY, data: ofDay(YESTERDAY) },
        },
      };
    }
    const from = url.searchParams.get("from") ?? "0000-00-00";
    const to = url.searchParams.get("to") ?? "9999-99-99";
    const id = url.searchParams.get("commodity");
    const rows = rates
      .filter(
        (r) =>
          r.rateDate >= from &&
          r.rateDate <= to &&
          (!id || r.commodityId === id),
      )
      .sort((a, b) => a.rateDate.localeCompare(b.rateDate));
    return {
      status: 200,
      body: { data: rows, meta: { page: 1, limit: 100, total: rows.length } },
    };
  });

  const puts = await mockEndpoint(page, "PUT", "/rates/*", (request) => {
    const date = new URL(request.url()).pathname.split("/")[2];
    const body = request.postDataJSON() as {
      rates: {
        commodityId: string;
        minRate: string;
        maxRate: string;
        avgRate?: string | null;
        rateUnit?: "maund" | "kg";
      }[];
    };
    const now = new Date().toISOString();
    for (const input of body.rates) {
      const index = rates.findIndex(
        (r) => r.rateDate === date && r.commodityId === input.commodityId,
      );
      const row: Rate = {
        id: index >= 0 ? rates[index].id : `rate-${rates.length + 1}`,
        commodityId: input.commodityId,
        rateDate: date,
        minRate: money(input.minRate) as string,
        maxRate: money(input.maxRate) as string,
        avgRate: money(input.avgRate),
        rateUnit: input.rateUnit ?? "maund",
        createdAt: index >= 0 ? rates[index].createdAt : now,
        updatedAt: now,
      };
      if (index >= 0) rates[index] = row;
      else rates.push(row);
    }
    return { status: 200, body: { date, data: ofDay(date) } };
  });

  return { puts };
}

const cell = (page: Page, column: "Min" | "Max" | "Avg", name: string) =>
  page.getByLabel(`${column} rate for ${name}`);

test.describe("daily rates", () => {
  // The ticket's "operator enters all rates using only the keyboard": only
  // the owner and managers have rate.manage, so a manager does the entry.
  test("manager enters every rate with the keyboard only → reload → values kept", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, manager);
    const api = await ratesApi(page);

    await page.goto("/rates");
    await expect(
      page.getByRole("heading", { level: 1, name: "Daily rates" }),
    ).toBeVisible();
    await expect(page.getByText("Today, 6 Nov 2026")).toBeVisible();

    // Into the grid with the keyboard, then type and press Enter / Tab.
    await cell(page, "Min", "Chawal").focus();
    await page.keyboard.type("6000");
    await page.keyboard.press("Enter");
    await page.keyboard.type("6400.5");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter"); // no avg for Chawal
    await page.keyboard.type("4000");
    await page.keyboard.press("Enter");
    await page.keyboard.type("4200");
    await page.keyboard.press("Enter");
    await page.keyboard.type("4100");
    await page.keyboard.press("Enter");
    await page.keyboard.type("2500");
    await page.keyboard.press("Tab");
    await page.keyboard.type("2700");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter"); // last cell → Save
    await expect(
      page.getByRole("button", { name: "Save rates" }),
    ).toBeFocused();
    await expect(page.getByText("You have unsaved changes")).toBeVisible();
    await page.keyboard.press("Enter");

    await expect(page.getByText("Rates saved.")).toBeVisible();
    expect(api.puts).toHaveLength(1);
    expect(api.puts[0].url()).toContain(`/rates/${TODAY}`);
    expect(api.puts[0].postDataJSON()).toEqual({
      rates: [
        {
          commodityId: commodities[0].id,
          minRate: "6000",
          maxRate: "6400.5",
          avgRate: null,
          rateUnit: "maund",
        },
        {
          commodityId: commodities[1].id,
          minRate: "4000",
          maxRate: "4200",
          avgRate: "4100",
          rateUnit: "maund",
        },
        {
          commodityId: commodities[2].id,
          minRate: "2500",
          maxRate: "2700",
          avgRate: null,
          rateUnit: "maund",
        },
      ],
    });
    await expect(page.getByText("You have unsaved changes")).toBeHidden();

    await page.reload();

    await expect(cell(page, "Min", "Chawal")).toHaveValue("6000.00");
    await expect(cell(page, "Max", "Chawal")).toHaveValue("6400.50");
    await expect(cell(page, "Avg", "Chawal")).toHaveValue("");
    await expect(cell(page, "Min", "Gandum")).toHaveValue("4000.00");
    await expect(cell(page, "Max", "Gandum")).toHaveValue("4200.00");
    await expect(cell(page, "Avg", "Gandum")).toHaveValue("4100.00");
    await expect(cell(page, "Min", "Makai")).toHaveValue("2500.00");
    await expect(cell(page, "Max", "Makai")).toHaveValue("2700.00");

    // The trend shows today's saved rate.
    await expect(page.getByTestId("rate-trend-chart")).toBeVisible();
  });

  test("max below min is caught before saving", async ({ page, context }) => {
    await signedIn(page, context, manager);
    const api = await ratesApi(page);
    await page.goto("/rates");

    await cell(page, "Min", "Gandum").fill("4200");
    await cell(page, "Max", "Gandum").fill("4000");
    await page.getByRole("button", { name: "Save rates" }).click();

    await expect(
      page.getByText("Max rate must be at least the min rate"),
    ).toBeVisible();
    await expect(cell(page, "Max", "Gandum")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(api.puts).toHaveLength(0);
  });

  test("Copy yesterday, then leaving with unsaved rates asks first", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, manager);
    await ratesApi(page, [
      {
        id: "y1",
        commodityId: commodities[1].id,
        rateDate: YESTERDAY,
        minRate: "3900.00",
        maxRate: "4150.00",
        avgRate: null,
        rateUnit: "maund",
        createdAt: "2026-11-05T05:00:00.000Z",
        updatedAt: "2026-11-05T05:00:00.000Z",
      },
    ]);
    await page.goto("/rates");

    await page.getByRole("button", { name: "Copy yesterday" }).click();
    await expect(cell(page, "Min", "Gandum")).toHaveValue("3900.00");
    await expect(cell(page, "Max", "Gandum")).toHaveValue("4150.00");
    await expect(page.getByText("You have unsaved changes")).toBeVisible();

    // Stay.
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toBe(
        "You have unsaved rates. Leave this page and lose them?",
      );
      void dialog.dismiss();
    });
    await page.getByRole("link", { name: "Purchases" }).click();
    await expect(page).toHaveURL(/\/rates$/);
    await expect(cell(page, "Min", "Gandum")).toHaveValue("3900.00");

    // Leave.
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("link", { name: "Purchases" }).click();
    await expect(page).toHaveURL(/\/purchases$/);
  });

  test("operator sees today's rates read-only: no inputs, Save or date picker", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, operator);
    await ratesApi(page);
    await page.goto("/rates?date=2026-11-01");

    await expect(page.getByText("Today, 6 Nov 2026")).toBeVisible();
    await expect(cell(page, "Min", "Gandum")).toHaveText("—");
    await expect(page.locator("input[data-rate-cell]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save rates" })).toHaveCount(
      0,
    );
    await expect(page.getByLabel("Date")).toHaveCount(0);
  });
});
