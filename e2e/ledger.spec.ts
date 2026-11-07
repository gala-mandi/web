import {
  type BrowserContext,
  expect,
  type Page,
  type Request,
  test,
} from "@playwright/test";
import Decimal from "decimal.js";
import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";
import {
  mockEndpoint,
  owner,
  session,
  setRefreshCookie,
  shopSettings,
} from "./mock-api";

type ShopUser = typeof owner;

const rafiq = {
  id: "44444444-4444-4444-8444-444444444444",
  type: "kissan" as const,
  name: "Rafiq Ahmad",
  fatherName: null,
  phone: "03001112223",
  village: "Chak 12",
};

/** A purchase as the purchases API saves it (only what the khata needs). */
interface Purchase {
  id: string;
  billNo: string;
  purchaseDate: string;
  netAmount: string;
  /** Paid to the kissan on the same save. */
  paidAmount: string;
}

/** A payment to the kissan (its voucher page is in `payments.spec.ts`). */
interface Payment {
  id: string;
  number: string;
  paymentDate: string;
  amount: string;
}

interface Line {
  id: number;
  entryDate: string;
  sourceType: string;
  sourceId: string | null;
  debit: string;
  credit: string;
  narration: string | null;
}

/**
 * The khata lines the server writes (server ticket 26): a purchase credits
 * the kissan with its net and debits what was paid on the same save; a
 * payment to him is a debit.
 */
function khataLines(purchases: Purchase[], payments: Payment[]): Line[] {
  let id = 0;
  const lines: Line[] = [];
  const line = (l: Omit<Line, "id">) => lines.push({ id: ++id, ...l });
  for (const p of purchases) {
    line({
      entryDate: p.purchaseDate,
      sourceType: "purchase",
      sourceId: p.id,
      debit: "0.00",
      credit: p.netAmount,
      narration: `Purchase ${p.billNo}`,
    });
    if (!new Decimal(p.paidAmount).isZero()) {
      line({
        entryDate: p.purchaseDate,
        sourceType: "purchase",
        sourceId: p.id,
        debit: p.paidAmount,
        credit: "0.00",
        narration: `Paid on purchase ${p.billNo}`,
      });
    }
  }
  for (const pay of payments) {
    line({
      entryDate: pay.paymentDate,
      sourceType: "payment",
      sourceId: pay.id,
      debit: pay.amount,
      credit: "0.00",
      narration: `Payment ${pay.number}`,
    });
  }
  return lines.sort(
    (a, b) => a.entryDate.localeCompare(b.entryDate) || a.id - b.id,
  );
}

const net = (lines: Line[]) =>
  lines.reduce((sum, l) => sum.plus(l.debit).minus(l.credit), new Decimal(0));

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
  // react-to-print prints from its own iframe: record what that frame would
  // print (the statement's rows) instead of opening the dialog.
  await page.addInitScript(() => {
    const top = window.top as unknown as { printedRows?: number[] };
    if (window === window.top) top.printedRows = [];
    window.print = () => {
      top.printedRows?.push(document.querySelectorAll("tbody tr").length);
    };
  });
}

/**
 * A fake ledger API over the given purchases and payments, like server
 * ticket 26: date filter, opening balance carried from before `from`,
 * running balance, closing balance, paging; and the balances list.
 */
async function ledgerApi(
  page: Page,
  purchases: Purchase[],
  payments: Payment[],
) {
  const statements: Request[] = [];
  await mockEndpoint(page, "GET", "/traders/lookup**", () => ({
    status: 200,
    body: { data: [rafiq] },
  }));
  await mockEndpoint(page, "GET", "/ledger/**", (request) => {
    const url = new URL(request.url());
    const all = khataLines(purchases, payments);
    if (url.pathname === "/ledger/balances") {
      const balance = net(all);
      const receivable = Decimal.max(balance, 0).toFixed(2);
      const payable = Decimal.max(balance.negated(), 0).toFixed(2);
      return {
        status: 200,
        body: {
          data: [
            {
              traderId: rafiq.id,
              type: rafiq.type,
              name: rafiq.name,
              phone: rafiq.phone,
              balance: balance.toFixed(2),
              receivable,
              payable,
            },
          ],
          totals: { receivable, payable },
          meta: { page: 1, limit: 20, total: 1 },
        },
      };
    }
    statements.push(request);
    const q = url.searchParams;
    const from = q.get("from");
    const to = q.get("to");
    const pageNo = Number(q.get("page") ?? 1);
    const limit = Number(q.get("limit") ?? 100);
    const opening = net(all.filter((l) => from && l.entryDate < from));
    const inRange = all.filter(
      (l) => (!from || l.entryDate >= from) && (!to || l.entryDate <= to),
    );
    let running = opening;
    const withBalance = inRange.map((l) => {
      running = running.plus(l.debit).minus(l.credit);
      return {
        ...l,
        traderId: rafiq.id,
        createdBy: "u1",
        createdAt: `${l.entryDate}T05:00:00.000Z`,
        balance: running.toFixed(2),
      };
    });
    return {
      status: 200,
      body: {
        trader: { id: rafiq.id, type: rafiq.type, name: rafiq.name },
        from,
        to,
        openingBalance: opening.toFixed(2),
        closingBalance: running.toFixed(2),
        data: withBalance.slice((pageNo - 1) * limit, pageNo * limit),
        meta: { page: pageNo, limit, total: withBalance.length },
      },
    };
  });
  return { statements };
}

const purchase: Purchase = {
  id: "55555555-5555-4555-8555-555555555551",
  billNo: "PUR-2026-27-000001",
  purchaseDate: "2026-11-02",
  netAmount: "100000.00",
  paidAmount: "20000.00",
};

const payment: Payment = {
  id: "99999999-9999-4999-8999-999999999991",
  number: "PAY-2026-27-000001",
  paymentDate: "2026-11-04",
  amount: "50000.00",
};

/** `GET /purchases/:id` for the purchase behind the khata line. */
async function purchaseDetail(page: Page) {
  await mockEndpoint(page, "GET", `/purchases/${purchase.id}`, () => ({
    status: 200,
    body: {
      ...purchase,
      trader: { id: rafiq.id, name: rafiq.name },
      grossAmount: "102500.00",
      totalDeductions: "2500.00",
      rounding: "0.00",
      status: "posted",
      notes: null,
      createdAt: "2026-11-02T05:00:00.000Z",
      updatedAt: "2026-11-02T05:00:00.000Z",
      createdBy: "u1",
      items: [],
      charges: [],
    },
  }));
}

const closing = (page: Page) => page.getByTestId("khata-closing");

test.describe("Ledger (khata)", () => {
  test("purchase + payment: the statement shows the correct closing balance and opens the purchase", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await ledgerApi(page, [purchase], [payment]);
    await purchaseDetail(page);
    await page.goto("/ledger");

    await page.getByRole("combobox", { name: "Trader" }).click();
    await page.getByRole("option", { name: /Rafiq Ahmad/ }).click();
    await expect(page).toHaveURL(`/ledger?trader=${rafiq.id}`);

    // Purchase credits Rs 100,000; Rs 20,000 paid on it and a Rs 50,000
    // payment are debits: the shop still owes Rafiq Rs 30,000.
    await expect(page.getByTestId("khata-opening")).toContainText("Rs 0.00");
    await expect(closing(page)).toContainText("Rs 30,000.00 Cr");
    await expect(closing(page)).toContainText("You owe them");

    const rows = page.getByRole("table").getByRole("row");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(1)).toContainText("Purchase PUR-2026-27-000001");
    await expect(rows.nth(1)).toContainText("Rs 100,000.00 Cr");
    await expect(rows.nth(2)).toContainText("Rs 80,000.00 Cr");
    await expect(rows.nth(3)).toContainText("Payment PAY-2026-27-000001");
    await expect(rows.nth(3)).toContainText("Rs 30,000.00 Cr");
    // A payment line opens its voucher.
    await expect(
      rows
        .nth(3)
        .getByRole("link", { name: "Open Payment PAY-2026-27-000001" }),
    ).toHaveAttribute("href", `/payments/${payment.id}`);

    // A narrower period carries the earlier lines into the opening balance.
    await page.getByRole("button", { name: /^Dates/ }).click();
    await page.getByLabel("From", { exact: true }).fill("2026-11-03");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/from=2026-11-03/);
    await expect(page.getByTestId("khata-opening")).toContainText(
      "Rs 80,000.00 Cr",
    );
    await expect(closing(page)).toContainText("Rs 30,000.00 Cr");
    await expect(rows).toHaveCount(2);
    expect(new URL(api.statements.at(-1)!.url()).searchParams.get("from")).toBe(
      "2026-11-03",
    );

    // Clicking a purchase line opens its bill.
    await page.getByRole("button", { name: /^Dates/ }).click();
    await page.getByRole("button", { name: "Clear" }).click();
    await page.getByText("Paid on purchase PUR-2026-27-000001").click();
    await expect(page).toHaveURL(`/purchases/${purchase.id}`);
    await expect(
      page.getByRole("article", {
        name: "Purchase parchi PUR-2026-27-000001",
      }),
    ).toBeVisible();
  });

  test("a long statement is paged on screen and prints every line", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const payments = Array.from({ length: 119 }, (_, i) => ({
      id: `99999999-9999-4999-8999-${String(i).padStart(12, "0")}`,
      number: `PAY-2026-27-${String(i + 1).padStart(6, "0")}`,
      paymentDate: "2026-11-04",
      amount: "100.00",
    }));
    const api = await ledgerApi(
      page,
      [{ ...purchase, paidAmount: "0.00" }],
      payments,
    );
    await page.goto(`/ledger?trader=${rafiq.id}`);

    // 120 lines: Rs 100,000 Cr less 119 × Rs 100 Dr.
    await expect(closing(page)).toContainText("Rs 88,100.00 Cr");
    await expect(page.getByText("Page 1 of 3")).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Page 2 of 3")).toBeVisible();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(51);

    await page.getByRole("button", { name: "Print" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { printedRows: number[] }).printedRows,
        ),
      )
      // Opening balance + 120 lines + closing balance, in one statement.
      .toEqual([122]);
    const full = api.statements.find(
      (r) => new URL(r.url()).searchParams.get("limit") === "500",
    );
    expect(full).toBeDefined();
  });

  test("the Urdu Excel statement has Urdu headings and the closing balance", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    await ledgerApi(page, [purchase], [payment]);
    await page.goto(`/ledger?trader=${rafiq.id}`);
    await expect(closing(page)).toContainText("Rs 30,000.00 Cr");

    await page.getByRole("combobox", { name: "Statement language" }).click();
    await page.getByRole("option", { name: "اردو" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excel" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(
      /^khata-rafiq-ahmad-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );

    const book = XLSX.read(await readFile(await file.path()));
    const rows = XLSX.utils.sheet_to_json<string[]>(
      book.Sheets[book.SheetNames[0]],
      { header: 1, defval: "" },
    );
    expect(book.SheetNames[0]).toBe("کھاتہ");
    expect(book.Workbook?.Views?.[0]?.RTL).toBe(true);
    expect(rows[0][0]).toBe("کھاتہ اسٹیٹمنٹ");
    expect(rows).toContainEqual([
      "",
      "موجودہ بقایا",
      "",
      "",
      // The Urdu statement writes the rupee word after the amount.
      "30,000.00 روپے",
      "جمع",
    ]);
  });

  test("balances: every trader with receivable / payable, opening their khata", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    await ledgerApi(page, [purchase], [payment]);
    await page.goto("/ledger");
    await page.getByRole("link", { name: "All balances" }).click();

    await expect(page).toHaveURL("/ledger/balances");
    await expect(page.getByRole("heading", { name: "Balances" })).toBeVisible();
    await expect(page.getByTestId("balances-total-payable")).toHaveText(
      /Rs 30,000.00/,
    );
    await expect(page.getByTestId("balances-total-receivable")).toHaveText(
      /Rs 0.00/,
    );
    const row = page.getByRole("row").filter({ hasText: "Rafiq Ahmad" });
    await expect(row).toContainText("Rs 30,000.00");
    await row.getByRole("link", { name: "Rafiq Ahmad" }).click();
    await expect(page).toHaveURL(`/ledger?trader=${rafiq.id}`);
    await expect(closing(page)).toContainText("Rs 30,000.00 Cr");
  });
});
