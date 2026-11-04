import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  mockEndpoint,
  operator,
  owner,
  session,
  setRefreshCookie,
} from "./mock-api";

type ShopUser = typeof owner;

interface Trader {
  id: string;
  type: "kissan" | "beopari" | "arhti";
  name: string;
  fatherName: string | null;
  phone: string | null;
  cnic: string | null;
  village: string | null;
  address: string | null;
  openingBalance: string;
  openingBalanceType: "debit" | "credit";
  creditLimit: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const aslam: Trader = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "kissan",
  name: "Muhammad Aslam",
  fatherName: "Muhammad Akram",
  phone: "03001234567",
  cnic: null,
  village: "Chak 45",
  address: null,
  openingBalance: "0.00",
  openingBalanceType: "debit",
  creditLimit: null,
  isActive: true,
  notes: null,
  createdAt: "2026-10-01T05:00:00.000Z",
  updatedAt: "2026-10-01T05:00:00.000Z",
};

const NEW_ID = "22222222-2222-4222-8222-222222222222";

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

/** "2500" → "2500.00", like the server's numeric columns. */
function money(value: string): string {
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

/** `GET /traders/:id`: the khata holds only the opening balance here. */
function detail(trader: Trader) {
  const sign = trader.openingBalanceType === "credit" ? "-" : "";
  return { ...trader, balance: `${sign}${trader.openingBalance}` };
}

/** A fake traders API that keeps its traders across requests. */
async function tradersApi(page: Page) {
  const traders: Trader[] = [{ ...aslam }];

  const gets = await mockEndpoint(page, "GET", "/traders**", (request) => {
    const url = new URL(request.url());
    const id = url.pathname.split("/")[2];
    if (id && id !== "lookup") {
      const found = traders.find((t) => t.id === id);
      return found
        ? { status: 200, body: detail(found) }
        : { status: 404, body: { statusCode: 404, message: "Not found" } };
    }
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const rows = traders.filter(
      (t) =>
        t.name.toLowerCase().includes(search) ||
        (search && t.phone?.includes(search)),
    );
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    return {
      status: 200,
      body: { data: rows, meta: { page, limit, total: rows.length } },
    };
  });

  const creates = await mockEndpoint(page, "POST", "/traders", (request) => {
    const body = request.postDataJSON();
    const phone = body.phone ? body.phone.replace(/\D/g, "") : null;
    if (phone && traders.some((t) => t.phone === phone)) {
      return {
        status: 409,
        body: {
          statusCode: 409,
          message: "Another trader in this shop has this phone number",
          code: "PHONE_TAKEN",
          errors: [
            {
              field: "phone",
              message: "Another trader in this shop has this phone number",
            },
          ],
        },
      };
    }
    const now = new Date().toISOString();
    const created: Trader = {
      ...body,
      id: NEW_ID,
      phone,
      openingBalance: money(body.openingBalance),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    traders.push(created);
    return { status: 201, body: created };
  });

  const patches = await mockEndpoint(page, "PATCH", "/traders/*", (request) => {
    const id = new URL(request.url()).pathname.split("/")[2];
    const index = traders.findIndex((t) => t.id === id);
    traders[index] = { ...traders[index], ...request.postDataJSON() };
    return { status: 200, body: detail(traders[index]) };
  });

  return { gets, creates, patches };
}

test.describe("traders", () => {
  test("owner adds a trader → edits → searches → opens the profile", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await tradersApi(page);

    await page.goto("/traders");
    await expect(
      page.getByRole("heading", { level: 1, name: "Traders" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Muhammad Aslam" }),
    ).toBeVisible();

    // Add, first with a phone another trader already has.
    await page.getByRole("button", { name: "Add trader" }).click();
    const sheet = page.getByRole("dialog", { name: "Add trader" });
    await sheet.getByRole("radio", { name: /Beopari/ }).check();
    await sheet.getByLabel(/^Name/).fill("Bashir Ahmed");
    await sheet.getByLabel(/^Phone/).fill("0300 1234567");
    await sheet.getByLabel(/^Opening balance/).fill("2500");
    await sheet.getByRole("button", { name: "Add trader" }).click();

    const phone = sheet.getByLabel(/^Phone/);
    await expect(
      sheet.getByText("Another trader in this shop has this phone number"),
    ).toBeVisible();
    await expect(phone).toHaveAttribute("aria-invalid", "true");
    await expect(sheet).toBeVisible();

    await phone.fill("0311 1111111");
    await sheet.getByRole("button", { name: "Add trader" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("Bashir Ahmed added.")).toBeVisible();
    expect(api.creates.at(-1)?.postDataJSON()).toMatchObject({
      type: "beopari",
      name: "Bashir Ahmed",
      phone: "0311 1111111",
      openingBalance: "2500",
      openingBalanceType: "debit",
    });
    const row = page.getByRole("row", { name: /Bashir Ahmed/ });
    await expect(row).toContainText("Beopari");
    await expect(row).toContainText("Rs 2,500.00");

    // Edit: only the changed field goes to the server.
    await page
      .getByRole("button", { name: "Actions for Bashir Ahmed" })
      .click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const edit = page.getByRole("dialog", { name: "Edit Bashir Ahmed" });
    await edit.getByLabel(/^Village/).fill("Chak 12");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(edit).toBeHidden();
    expect(api.patches[0].postDataJSON()).toEqual({ village: "Chak 12" });
    await expect(row).toContainText("Chak 12");

    // Search by name: the URL keeps it.
    await page.getByLabel("Search traders").fill("bash");
    await expect(page).toHaveURL(/[?&]q=bash/);
    await expect(
      page.getByRole("link", { name: "Muhammad Aslam" }),
    ).toHaveCount(0);
    expect(
      api.gets.some(
        (r) => new URL(r.url()).searchParams.get("search") === "bash",
      ),
    ).toBe(true);

    // Profile.
    await page.getByRole("link", { name: "Bashir Ahmed" }).click();
    await expect(page).toHaveURL(`/traders/${NEW_ID}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Bashir Ahmed" }),
    ).toBeVisible();
    const balance = page.getByRole("region", { name: "Current balance" });
    await expect(balance).toContainText("Rs 2,500.00");
    await expect(balance).toContainText("Receivable");
    await expect(
      page.getByRole("heading", { name: "Recent transactions" }),
    ).toBeVisible();
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs).toContainText("Trader profile");
    await crumbs.getByRole("link", { name: "Traders" }).click();
    await expect(page).toHaveURL("/traders");
  });

  test("an unknown trader shows page not found", async ({ page, context }) => {
    await signedIn(page, context, owner);
    await tradersApi(page);

    await page.goto("/traders/33333333-3333-4333-8333-333333333333");

    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
  });

  test("operator opening /traders gets 403", async ({ page, context }) => {
    await signedIn(page, context, operator);
    const api = await tradersApi(page);

    await page.goto("/traders");

    await expect(
      page.getByRole("heading", { level: 1, name: "You don’t have access" }),
    ).toBeVisible();
    await expect(page.getByText("403")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add trader" })).toHaveCount(
      0,
    );
    expect(api.gets).toHaveLength(0);
  });
});
