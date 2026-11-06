import {
  type BrowserContext,
  expect,
  type Page,
  type Request,
  test,
} from "@playwright/test";
import Decimal from "decimal.js";
import { standardCharges } from "../src/lib/charges/calculate-transaction";
import { calculateSale } from "../src/lib/charges/sale-totals";
import {
  API,
  mockEndpoint,
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

/** Owes Rs 20,000 from before; may owe up to Rs 120,000. */
const shahid = {
  id: "99999999-9999-4999-8999-999999999999",
  type: "beopari",
  name: "Shahid Traders",
  fatherName: null,
  phone: "03004445556",
  cnic: null,
  village: "Okara",
  address: null,
  openingBalance: "20000.00",
  openingBalanceType: "debit",
  creditLimit: "120000.00",
  isActive: true,
  notes: null,
  createdAt: "2026-10-01T05:00:00.000Z",
  updatedAt: "2026-10-01T05:00:00.000Z",
};

interface Body {
  buyerId: string;
  saleDate?: string;
  items: {
    commodityId: string;
    purchaseItemId?: string | null;
    bags?: number | null;
    weightKg: string;
    rate: string;
    rateUnit: "kg" | "maund" | "bag";
  }[];
  receivedAmount?: string;
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
 * A fake server for the sale screens: rates, commodity and beopari pickers,
 * the beopari's khata balance, and a sales API that saves each
 * Idempotency-Key once and debits the beopari with the net, like the server
 * (ticket 22). With `block`, a sale over the credit limit gets 409 and is
 * not saved (the shop's setting "block"); otherwise it is saved with a
 * warning ("warn").
 */
async function shopApi(page: Page, { block = false } = {}) {
  const sales: Record<string, unknown>[] = [];
  const byKey = new Map<string, Record<string, unknown>>();
  const posts: Request[] = [];

  /** The khata: the opening balance plus each saved sale's net. */
  const balance = () =>
    sales
      .filter((s) => s.status === "posted")
      .reduce(
        (sum, s) => sum.plus(s.netAmount as string),
        new Decimal(shahid.openingBalance),
      );

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
      // Only beoparis can buy: the form asks for them.
      const type = url.searchParams.get("type");
      const { id, name, fatherName, phone, village } = shahid;
      return {
        status: 200,
        body: {
          data:
            type === "beopari"
              ? [{ id, type: "beopari", name, fatherName, phone, village }]
              : [],
        },
      };
    }
    return {
      status: 200,
      body: { ...shahid, balance: balance().toFixed(2) },
    };
  });

  await page.route(`${API}/sales**`, async (route) => {
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
        await reply(200, { ...known, warnings: [] });
        return;
      }
      const body = request.postDataJSON() as Body;
      const totals = calculateSale(
        body.items.map((item) => ({
          ...item,
          charges: standardCharges(charges),
        })),
        "40",
      );
      const after = balance().plus(totals.netAmount);
      const over = after.greaterThan(shahid.creditLimit);
      const message = `${shahid.name} would owe Rs ${after.toFixed(2)}, above the credit limit of Rs ${shahid.creditLimit}`;
      if (over && block) {
        await reply(409, {
          statusCode: 409,
          message,
          code: "CREDIT_LIMIT_EXCEEDED",
          errors: [{ field: "buyerId", message }],
        });
        return;
      }
      const n = sales.length + 1;
      const sale = {
        id: `aaaaaaaa-5555-4555-8555-55555555555${n}`,
        billNo: `SAL-2026-27-00000${n}`,
        saleDate: body.saleDate ?? TODAY,
        buyer: { id: shahid.id, name: shahid.name },
        grossAmount: totals.grossAmount,
        totalCharges: totals.totalCharges,
        rounding: totals.rounding,
        netAmount: totals.netAmount,
        receivedAmount: "0.00",
        status: "posted",
        notes: body.notes ?? null,
        createdAt: "2026-11-06T05:00:00.000Z",
        updatedAt: "2026-11-06T05:00:00.000Z",
        createdBy: "u1",
        items: body.items.map((item, i) => ({
          id: `bbbbbbbb-6666-4666-8666-66666666666${i}`,
          commodityName: gandum.name,
          ...item,
          purchaseItemId: item.purchaseItemId ?? null,
          bags: item.bags ?? null,
          amount: totals.itemAmounts[i],
        })),
        charges: totals.charges.map((c, i) => ({
          id: `cccccccc-7777-4777-8777-77777777777${i}`,
          ...c,
        })),
      };
      sales.push(sale);
      byKey.set(key, sale);
      const warnings = over
        ? [
            {
              code: "CREDIT_LIMIT_EXCEEDED",
              message,
              balance: after.toFixed(2),
              creditLimit: shahid.creditLimit,
            },
          ]
        : [];
      await reply(201, { ...sale, warnings });
      return;
    }

    if (request.method() === "GET" && id) {
      const sale = sales.find((s) => s.id === id);
      await (sale
        ? reply(200, sale)
        : reply(404, { statusCode: 404, message: "Not found" }));
      return;
    }

    if (request.method() === "GET") {
      // List rows carry no items, charges or author.
      const detailOnly = new Set(["items", "charges", "createdBy"]);
      const data = [...sales]
        .reverse()
        .map((s) =>
          Object.fromEntries(
            Object.entries(s).filter(([key]) => !detailOnly.has(key)),
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

  return { sales, posts };
}

const field = (page: Page, label: string, n = 1) =>
  page.getByLabel(new RegExp(`^${label}, Item ${n}$`));

test.describe("Sales", () => {
  test("a sale typed with the keyboard only warns about the credit limit, prints and shows in the beopari's khata", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await shopApi(page);
    await page.goto("/sales/new");

    // The form opens on the beopari.
    const beopari = page.getByRole("combobox", { name: "Beopari" });
    await expect(beopari).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.type("Shah");
    await expect(
      page.getByRole("option", { name: /Shahid Traders/ }),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(beopari).toHaveText(/Shahid Traders/);
    await expect(beopari).toBeFocused();

    // Balance and credit limit next to the name.
    await expect(page.getByTestId("sale-buyer-balance")).toHaveText(
      "Balance: Rs 20,000.00 receivable Credit limit: Rs 120,000.00",
    );

    // Notes, then the first commodity.
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Notes")).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Gan");
    await expect(page.getByRole("option", { name: /Gandum/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("combobox", { name: /^Commodity, Item 1$/ }),
    ).toBeFocused();

    // Bags, weight in maund, today's rate, Enter for the next item.
    await page.keyboard.press("Tab");
    await page.keyboard.type("10");
    await page.keyboard.press("Enter");
    await expect(field(page, "Weight")).toBeFocused();
    await page.keyboard.type("25.25");
    await page.keyboard.press("Enter");
    await expect(field(page, "Rate")).toHaveValue("4000");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("combobox", { name: /^Commodity, Item 2$/ }),
    ).toBeFocused();

    // Live total: 101,000 + 2% + 0.5% + Rs 20 × 10 = 103,725.
    await expect(page.getByTestId("sale-net")).toHaveText("Rs 103,725.00");

    // 20,000 + 103,725 is above the Rs 120,000 limit: warned before saving.
    const warning = page.getByTestId("sale-credit-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(
      "After this sale Shahid Traders would owe Rs 123,725.00, above the credit limit of Rs 120,000.00.",
    );
    expect(api.posts).toHaveLength(0);

    // Ctrl+P: save (the shop warns, so it saves) and print.
    await page.keyboard.press("Control+p");
    await expect(page).toHaveURL(
      /\/sales\/aaaaaaaa-5555-4555-8555-555555555551$/,
    );
    expect(api.posts).toHaveLength(1);
    expect(api.posts[0].headers()["idempotency-key"]).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    expect(api.posts[0].postDataJSON()).toEqual({
      buyerId: shahid.id,
      saleDate: TODAY,
      items: [
        {
          commodityId: gandum.id,
          bags: 10,
          weightKg: "1010.000",
          rate: "4000",
          rateUnit: "maund",
        },
      ],
      notes: null,
    });
    await expect(page.getByText("Saved over the credit limit")).toBeVisible();

    // Print preview: only the bill.
    const bill = page.getByRole("article", { name: "Bill SAL-2026-27-000001" });
    await expect(bill).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { printed: number }).printed),
      )
      .toBe(1);
    await expect(bill).toContainText("Sale bill (parchi)");
    await expect(bill).toContainText("25 mn 10 kg");
    await expect(bill.getByTestId("sale-net")).toHaveText("Rs 103,725.00");
    await page.emulateMedia({ media: "print" });
    await expect(bill).toBeVisible();
    await expect(page.getByRole("button", { name: "Print" })).toBeHidden();
    await page.emulateMedia({ media: "screen" });

    // The beopari's khata: debited with the net straight away.
    await page.getByRole("link", { name: "Open beopari’s khata" }).click();
    await expect(page).toHaveURL(new RegExp(`/traders/${shahid.id}$`));
    await expect(page.getByTestId("trader-balance")).toHaveText(
      "Rs 123,725.00",
    );
    await expect(page.getByText("Receivable", { exact: true })).toBeVisible();

    // The list.
    await page.getByRole("link", { name: "Sales", exact: true }).click();
    await expect(page).toHaveURL(/\/sales$/);
    const row = page.getByRole("row").filter({ hasText: "SAL-2026-27-000001" });
    await expect(row).toContainText("Shahid Traders");
    await expect(row).toContainText("Rs 103,725.00");
    await expect(row).toContainText("Saved");
  });

  test("a shop that blocks over-limit sales keeps the bill and shows why on the beopari", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await shopApi(page, { block: true });
    await page.goto("/sales/new");

    await page.getByRole("combobox", { name: "Beopari" }).click();
    await page.getByRole("option", { name: /Shahid Traders/ }).click();
    await page.getByRole("combobox", { name: /^Commodity, Item 1$/ }).click();
    await page.getByRole("option", { name: /Gandum/ }).click();
    await field(page, "Weight").fill("30");
    await expect(page.getByTestId("sale-credit-warning")).toBeVisible();

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByText(/Shahid Traders would owe Rs 143,000.00/),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Beopari" }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/sales\/new$/);
    expect(api.posts).toHaveLength(1);
    expect(api.sales).toHaveLength(0);

    // Fewer maund fits the limit; the retry reuses the form's key.
    await field(page, "Weight").fill("20");
    await expect(page.getByTestId("sale-credit-warning")).toBeHidden();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(
      /\/sales\/aaaaaaaa-5555-4555-8555-555555555551$/,
    );
    expect(api.posts[1].headers()["idempotency-key"]).toBe(
      api.posts[0].headers()["idempotency-key"],
    );
  });
});
