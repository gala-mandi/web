import {
  type BrowserContext,
  expect,
  type Page,
  type Request,
  test,
} from "@playwright/test";
import Decimal from "decimal.js";
import { standardCharges } from "../src/lib/charges/calculate-transaction";
import { calculatePurchase } from "../src/lib/charges/purchase-totals";
import {
  API,
  mockEndpoint,
  operator,
  owner,
  session,
  setRefreshCookie,
  shopSettings,
} from "./mock-api";

type ShopUser = typeof owner;

const TODAY = "2026-11-06";

const gandum = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Gandum",
  nameUr: "گندم",
  category: "grain",
  defaultUnit: "maund",
  bagWeightKg: null,
  commissionPct: "2.00",
  marketFeePct: "0.50",
  labourPerBag: "20.00",
  isActive: true,
  createdAt: "2026-10-01T05:00:00.000Z",
  updatedAt: "2026-10-01T05:00:00.000Z",
};
const charges = {
  commissionPct: "2.00",
  marketFeePct: "0.50",
  labourPerBag: "20.00",
};

const rafiq = {
  id: "44444444-4444-4444-8444-444444444444",
  type: "kissan",
  name: "Rafiq Ahmad",
  fatherName: null,
  phone: "03001112223",
  cnic: null,
  village: "Chak 12",
  address: null,
  openingBalance: "0.00",
  openingBalanceType: "debit",
  creditLimit: null,
  isActive: true,
  notes: null,
  createdAt: "2026-10-01T05:00:00.000Z",
  updatedAt: "2026-10-01T05:00:00.000Z",
};

interface Body {
  traderId: string;
  purchaseDate?: string;
  items: {
    commodityId: string;
    bags?: number | null;
    weightKg: string;
    rate: string;
    rateUnit: "kg" | "maund" | "bag";
  }[];
  notes?: string | null;
}

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
  await mockEndpoint(page, "GET", "/settings", () => ({
    status: 200,
    body: shopSettings,
  }));
  // Record window.print() instead of opening the dialog.
  await page.addInitScript(() => {
    const w = window as unknown as { printed: number };
    w.printed = 0;
    window.print = () => {
      w.printed += 1;
    };
  });
}

/**
 * A fake server for the purchase screens: rates, commodity and kissan
 * pickers, and a purchases API that keeps its bills, saves each
 * Idempotency-Key once and credits the kissan's khata with the net, like
 * server#34. `dropFirstResponse` saves the first bill but loses the answer,
 * as a dropped connection does.
 */
async function shopApi(page: Page, { dropFirstResponse = false } = {}) {
  const purchases: Record<string, unknown>[] = [];
  const byKey = new Map<string, Record<string, unknown>>();
  const posts: Request[] = [];
  let dropped = false;

  await mockEndpoint(page, "GET", "/rates/today", () => ({
    status: 200,
    body: {
      date: TODAY,
      data: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          commodityId: gandum.id,
          rateDate: TODAY,
          minRate: "3900.00",
          maxRate: "4100.00",
          avgRate: "4000.00",
          rateUnit: "maund",
          createdAt: "2026-11-06T04:00:00.000Z",
          updatedAt: "2026-11-06T04:00:00.000Z",
        },
      ],
      yesterday: { date: "2026-11-05", data: [] },
    },
  }));

  await mockEndpoint(page, "GET", "/commodities**", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/commodities/lookup") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const { id, name, nameUr, defaultUnit, bagWeightKg } = gandum;
      return {
        status: 200,
        body: {
          data: name.toLowerCase().startsWith(q)
            ? [{ id, name, nameUr, defaultUnit, bagWeightKg, charges }]
            : [],
        },
      };
    }
    return {
      status: 200,
      body: { data: [gandum], meta: { page: 1, limit: 100, total: 1 } },
    };
  });

  await mockEndpoint(page, "GET", "/traders**", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/traders/lookup") {
      const { id, type, name, fatherName, phone, village } = rafiq;
      return {
        status: 200,
        body: { data: [{ id, type, name, fatherName, phone, village }] },
      };
    }
    // The khata: each saved purchase credits the kissan with its net.
    const owed = purchases
      .filter((p) => p.status === "posted")
      .reduce((sum, p) => sum.plus(p.netAmount as string), new Decimal(0));
    return {
      status: 200,
      body: { ...rafiq, balance: owed.negated().toFixed(2) },
    };
  });

  await page.route(`${API}/purchases**`, async (route) => {
    const request = route.request();
    const origin = await request.headerValue("origin");
    const headers = {
      "access-control-allow-origin": origin ?? "*",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers":
        "authorization, content-type, accept, idempotency-key",
      "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
    };
    const reply = (status: number, body: unknown) =>
      route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = new URL(request.url());
    const id = url.pathname.split("/")[2];

    if (request.method() === "POST" && !id) {
      posts.push(request);
      const key = (await request.headerValue("idempotency-key")) ?? "";
      const known = byKey.get(key);
      if (known) {
        await reply(200, known);
        return;
      }
      const body = request.postDataJSON() as Body;
      const totals = calculatePurchase(
        body.items.map((item) => ({
          ...item,
          charges: standardCharges(charges),
        })),
        "40",
      );
      const n = purchases.length + 1;
      const purchase = {
        id: `55555555-5555-4555-8555-55555555555${n}`,
        billNo: `PUR-2026-27-00000${n}`,
        purchaseDate: body.purchaseDate ?? TODAY,
        trader: { id: rafiq.id, name: rafiq.name },
        grossAmount: totals.grossAmount,
        totalDeductions: totals.totalDeductions,
        rounding: totals.rounding,
        netAmount: totals.netAmount,
        paidAmount: "0.00",
        status: "posted",
        notes: body.notes ?? null,
        createdAt: "2026-11-06T05:00:00.000Z",
        updatedAt: "2026-11-06T05:00:00.000Z",
        createdBy: "u1",
        items: body.items.map((item, i) => ({
          id: `66666666-6666-4666-8666-66666666666${i}`,
          commodityName: gandum.name,
          ...item,
          bags: item.bags ?? null,
          amount: totals.itemAmounts[i],
        })),
        charges: totals.charges.map((c, i) => ({
          id: `77777777-7777-4777-8777-77777777777${i}`,
          ...c,
        })),
      };
      purchases.push(purchase);
      byKey.set(key, purchase);
      if (dropFirstResponse && !dropped) {
        dropped = true;
        await route.abort("internetdisconnected");
        return;
      }
      await reply(201, purchase);
      return;
    }

    if (request.method() === "GET" && id) {
      const purchase = purchases.find((p) => p.id === id);
      await (purchase
        ? reply(200, purchase)
        : reply(404, { statusCode: 404, message: "Not found" }));
      return;
    }

    if (request.method() === "GET") {
      // List rows carry no items, charges or author.
      const detailOnly = new Set(["items", "charges", "createdBy"]);
      const data = [...purchases]
        .reverse()
        .map((p) =>
          Object.fromEntries(
            Object.entries(p).filter(([key]) => !detailOnly.has(key)),
          ),
        );
      await reply(200, {
        data,
        meta: { page: 1, limit: 20, total: data.length },
      });
      return;
    }
    await route.fallback();
  });

  return { purchases, posts };
}

const field = (page: Page, label: string, n = 1) =>
  page.getByLabel(new RegExp(`^${label}, Item ${n}$`));

test.describe("Purchases", () => {
  test("a purchase typed with the keyboard only is printed and shows in the list and the kissan's khata", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await shopApi(page);
    await page.goto("/purchases/new");

    // The form opens on the kissan.
    const kissan = page.getByRole("combobox", { name: "Kissan" });
    await expect(kissan).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.type("Rafiq");
    await expect(
      page.getByRole("option", { name: /Rafiq Ahmad/ }),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(kissan).toHaveText(/Rafiq Ahmad/);
    await expect(kissan).toBeFocused();

    // Notes, then the first commodity.
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Notes")).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Gan");
    await expect(page.getByRole("option", { name: /Gandum/ })).toBeVisible();
    await page.keyboard.press("Enter");
    const commodity = page.getByRole("combobox", {
      name: /^Commodity, Item 1$/,
    });
    await expect(commodity).toHaveText(/Gandum/);
    await expect(commodity).toBeFocused();

    // Bags, weight in maund, today's rate (pre-filled), Enter for the next item.
    await page.keyboard.press("Tab");
    await page.keyboard.type("10");
    await page.keyboard.press("Enter");
    await expect(field(page, "Weight")).toBeFocused();
    await page.keyboard.type("25.25");
    await expect(page.getByTestId("purchase-item-0-kg")).toHaveText(
      "= 1,010 kg (25 mn 10 kg)",
    );
    await page.keyboard.press("Enter");
    await expect(field(page, "Rate")).toBeFocused();
    await expect(field(page, "Rate")).toHaveValue("4000");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("combobox", { name: /^Commodity, Item 2$/ }),
    ).toBeFocused();

    // Live total: 1,010 kg × 4,000 ÷ 40 = 101,000 − 2% − 0.5% − Rs 20 × 10.
    await expect(page.getByTestId("purchase-net")).toHaveText("Rs 98,275.00");

    // Ctrl+P: save (the blank second row is left out) and print.
    await page.keyboard.press("Control+p");
    await expect(page).toHaveURL(
      /\/purchases\/55555555-5555-4555-8555-555555555551$/,
    );
    expect(api.posts).toHaveLength(1);
    expect(api.posts[0].headers()["idempotency-key"]).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    expect(api.posts[0].postDataJSON()).toMatchObject({
      traderId: rafiq.id,
      items: [
        {
          commodityId: gandum.id,
          bags: 10,
          weightKg: "1010.000",
          rate: "4000",
          rateUnit: "maund",
        },
      ],
    });

    // Print preview: only the bill, with the rounding line.
    const bill = page.getByRole("article", { name: "Bill PUR-2026-27-000001" });
    await expect(bill).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { printed: number }).printed),
      )
      .toBe(1);
    await expect(bill).toContainText("25 mn 10 kg");
    await expect(bill).toContainText("Rounding");
    await expect(bill.getByTestId("purchase-net")).toHaveText("Rs 98,275.00");
    await page.emulateMedia({ media: "print" });
    await expect(bill).toBeVisible();
    await expect(page.getByRole("button", { name: "Print" })).toBeHidden();
    await page.emulateMedia({ media: "screen" });

    // The kissan's khata: credited with the net (the shop owes him).
    await page.getByRole("link", { name: "Open kissan’s khata" }).click();
    await expect(page).toHaveURL(new RegExp(`/traders/${rafiq.id}$`));
    await expect(page.getByTestId("trader-balance")).toHaveText("Rs 98,275.00");
    await expect(page.getByText("Payable", { exact: true })).toBeVisible();

    // The list.
    await page.getByRole("link", { name: "Purchases", exact: true }).click();
    await expect(page).toHaveURL(/\/purchases$/);
    const row = page.getByRole("row").filter({ hasText: "PUR-2026-27-000001" });
    await expect(row).toContainText("Rafiq Ahmad");
    await expect(row).toContainText("Rs 98,275.00");
    await expect(row).toContainText("Saved");
  });

  test("a dropped connection while saving shows a clear error and the retry saves once", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, operator);
    const api = await shopApi(page, { dropFirstResponse: true });
    await page.goto("/purchases/new");

    await page.getByRole("combobox", { name: "Kissan" }).click();
    await page.getByRole("option", { name: /Rafiq Ahmad/ }).click();
    await page.getByRole("combobox", { name: /^Commodity, Item 1$/ }).click();
    await page.getByRole("option", { name: /Gandum/ }).click();
    await field(page, "Weight").fill("25");

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByTestId("purchase-form-error")).toContainText(
      "Can’t reach the server",
    );
    await expect(page).toHaveURL(/\/purchases\/new$/);

    // The server did save it; the retry gets the same bill back (200).
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(
      /\/purchases\/55555555-5555-4555-8555-555555555551$/,
    );
    expect(api.posts).toHaveLength(2);
    expect(api.posts[1].headers()["idempotency-key"]).toBe(
      api.posts[0].headers()["idempotency-key"],
    );
    expect(api.purchases).toHaveLength(1);

    await page.getByRole("link", { name: "All purchases" }).click();
    await expect(
      page.getByRole("row").filter({ hasText: "PUR-2026-27-00000" }),
    ).toHaveCount(1);
  });

  test("leaving with an unsaved purchase asks first", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, operator);
    await shopApi(page);
    await page.goto("/purchases/new");
    await page.getByRole("combobox", { name: /^Commodity, Item 1$/ }).click();
    await page.getByRole("option", { name: /Gandum/ }).click();
    await field(page, "Weight").fill("25");

    page.once("dialog", (dialog) => {
      expect(dialog.message()).toBe(
        "This purchase isn’t saved. Leave and lose it?",
      );
      void dialog.dismiss();
    });
    await page
      .getByRole("navigation", { name: "Main menu" })
      .getByRole("link", { name: "Daily rates" })
      .click();
    await expect(page).toHaveURL(/\/purchases\/new$/);
    await expect(field(page, "Weight")).toHaveValue("25");

    page.once("dialog", (dialog) => void dialog.accept());
    await page
      .getByRole("navigation", { name: "Main menu" })
      .getByRole("link", { name: "Daily rates" })
      .click();
    await expect(page).toHaveURL(/\/rates$/);
  });
});
