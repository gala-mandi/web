import {
  type BrowserContext,
  expect,
  type Page,
  type Request,
  type Route,
  test,
} from "@playwright/test";
import Decimal from "decimal.js";
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
/** 10:30 am in Karachi on TODAY. */
const NOW = new Date("2026-11-06T05:30:00.000Z");

const rafiq = {
  id: "44444444-4444-4444-8444-444444444444",
  type: "kissan" as const,
  name: "Rafiq Ahmad",
  fatherName: null,
  phone: "03001112223",
  village: "Chak 12",
};
const shahid = {
  id: "99999999-9999-4999-8999-999999999999",
  type: "beopari" as const,
  name: "Shahid Traders",
  fatherName: null,
  phone: "03004445556",
  village: "Okara",
};
const traders = [rafiq, shahid];

interface Bill {
  id: string;
  kind: "purchase" | "sale";
  billNo: string;
  date: string;
  traderId: string;
  netAmount: string;
  /** Paid / received on the bill's own save. */
  settledOnSave: string;
}

/** Rafiq: Rs 30,000 left on PUR-1, all of PUR-2; Shahid owes SAL-1. */
const bills: Bill[] = [
  {
    id: "55555555-5555-4555-8555-555555555551",
    kind: "purchase",
    billNo: "PUR-2026-27-000001",
    date: "2026-11-01",
    traderId: rafiq.id,
    netAmount: "60000.00",
    settledOnSave: "30000.00",
  },
  {
    id: "55555555-5555-4555-8555-555555555552",
    kind: "purchase",
    billNo: "PUR-2026-27-000002",
    date: "2026-11-03",
    traderId: rafiq.id,
    netAmount: "80000.00",
    settledOnSave: "0.00",
  },
  {
    id: "aaaaaaaa-5555-4555-8555-555555555551",
    kind: "sale",
    billNo: "SAL-2026-27-000001",
    date: "2026-11-02",
    traderId: shahid.id,
    netAmount: "50000.00",
    settledOnSave: "0.00",
  },
];

interface Voucher {
  id: string;
  voucherNo: string;
  direction: "paid" | "received";
  paymentDate: string;
  trader: { id: string; name: string };
  amount: string;
  allocated: string;
  advance: string;
  method: string;
  reference: string | null;
  status: "posted" | "cancelled";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  allocations: {
    id: string;
    purchaseId: string | null;
    saleId: string | null;
    billNo: string;
    billDate: string;
    amount: string;
  }[];
}

interface Body {
  direction: "paid" | "received";
  traderId: string;
  paymentDate?: string;
  amount: string;
  method: string;
  reference?: string | null;
  notes?: string | null;
  allocations?: { purchaseId?: string; saleId?: string; amount?: string }[];
}

async function signedIn(page: Page, context: BrowserContext, user: ShopUser) {
  await page.clock.setFixedTime(NOW);
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
  // print (paper, language, text) instead of opening the dialog.
  await page.addInitScript(() => {
    type Printed = { paper: string; lang: string; text: string };
    const top = window.top as unknown as { printed?: Printed[] };
    if (window === window.top) top.printed = [];
    window.print = () => {
      const doc = document.querySelector<HTMLElement>("[data-parchi]");
      top.printed?.push({
        paper: doc?.dataset.parchi ?? "",
        lang: doc?.lang ?? "",
        text: doc?.textContent ?? "",
      });
    };
  });
}

function cors(origin: string | null) {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers":
      "authorization, content-type, accept, idempotency-key",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };
}

/**
 * A fake server like server ticket 28: vouchers saved once per
 * Idempotency-Key, filling the named bills in order (min(bill left, amount
 * left)) with the rest as an advance; bills' `outstanding`; each trader's
 * khata (a purchase credits the kissan, a payment debits him); and the cash
 * book from posted cash vouchers, with Rs 70,000 received in cash the day
 * before.
 */
async function shopApi(page: Page) {
  const earlier: Voucher = {
    id: "dddddddd-8888-4888-8888-888888888880",
    voucherNo: "RCT-2026-27-000000",
    direction: "received",
    paymentDate: "2026-11-05",
    trader: { id: shahid.id, name: shahid.name },
    amount: "70000.00",
    allocated: "0.00",
    advance: "70000.00",
    method: "cash",
    reference: null,
    status: "posted",
    notes: null,
    createdAt: "2026-11-05T05:00:00.000Z",
    updatedAt: "2026-11-05T05:00:00.000Z",
    createdBy: "u1",
    allocations: [],
  };
  const vouchers: Voucher[] = [earlier];
  const byKey = new Map<string, Voucher>();
  const posts: Request[] = [];
  let paid = 0;
  let received = 0;

  const allocatedTo = (billId: string) =>
    vouchers
      .filter((v) => v.status === "posted")
      .flatMap((v) => v.allocations)
      .filter((a) => a.purchaseId === billId || a.saleId === billId)
      .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
  const outstandingOf = (bill: Bill) =>
    new Decimal(bill.netAmount)
      .minus(bill.settledOnSave)
      .minus(allocatedTo(bill.id));

  /** Debit − credit of a trader's khata. */
  const khata = (traderId: string) => {
    let id = 0;
    const lines: Record<string, unknown>[] = [];
    for (const bill of bills.filter((b) => b.traderId === traderId)) {
      const purchase = bill.kind === "purchase";
      lines.push({
        id: ++id,
        entryDate: bill.date,
        sourceType: bill.kind,
        sourceId: bill.id,
        debit: purchase ? "0.00" : bill.netAmount,
        credit: purchase ? bill.netAmount : "0.00",
        narration: `${purchase ? "Purchase" : "Sale"} ${bill.billNo}`,
      });
      if (!new Decimal(bill.settledOnSave).isZero()) {
        lines.push({
          id: ++id,
          entryDate: bill.date,
          sourceType: bill.kind,
          sourceId: bill.id,
          debit: purchase ? bill.settledOnSave : "0.00",
          credit: purchase ? "0.00" : bill.settledOnSave,
          narration: `${purchase ? "Paid on purchase" : "Received on sale"} ${bill.billNo}`,
        });
      }
    }
    for (const v of vouchers.filter((x) => x.trader.id === traderId)) {
      const out = v.direction === "paid";
      lines.push({
        id: ++id,
        entryDate: v.paymentDate,
        sourceType: out ? "payment" : "receipt",
        sourceId: v.id,
        debit: out ? v.amount : "0.00",
        credit: out ? "0.00" : v.amount,
        narration: `${out ? "Payment" : "Receipt"} ${v.voucherNo}`,
      });
    }
    lines.sort((a, b) =>
      String(a.entryDate).localeCompare(String(b.entryDate)),
    );
    let running = new Decimal(0);
    const data = lines.map((l) => {
      running = running.plus(l.debit as string).minus(l.credit as string);
      return {
        ...l,
        traderId,
        createdBy: "u1",
        createdAt: `${l.entryDate}T05:00:00.000Z`,
        balance: running.toFixed(2),
      };
    });
    return { data, balance: running };
  };

  await mockEndpoint(page, "GET", "/traders**", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/traders/lookup") {
      const type = url.searchParams.get("type");
      return {
        status: 200,
        body: { data: traders.filter((t) => !type || t.type === type) },
      };
    }
    const trader = traders.find((t) => url.pathname.endsWith(t.id))!;
    return {
      status: 200,
      body: {
        ...trader,
        cnic: null,
        address: null,
        openingBalance: "0.00",
        openingBalanceType: "debit",
        creditLimit: null,
        isActive: true,
        notes: null,
        createdAt: "2026-10-01T05:00:00.000Z",
        updatedAt: "2026-10-01T05:00:00.000Z",
        balance: khata(trader.id).balance.toFixed(2),
      },
    };
  });

  for (const kind of ["purchase", "sale"] as const) {
    await mockEndpoint(page, "GET", `/${kind}s**`, (request) => {
      const q = new URL(request.url()).searchParams;
      const traderId = q.get(kind === "purchase" ? "trader" : "buyer");
      const rows = bills
        .filter((b) => b.kind === kind && b.traderId === traderId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((b) => {
          const trader = traders.find((t) => t.id === b.traderId)!;
          const party = { id: trader.id, name: trader.name };
          return {
            id: b.id,
            billNo: b.billNo,
            ...(kind === "purchase"
              ? {
                  purchaseDate: b.date,
                  trader: party,
                  totalDeductions: "0.00",
                  paidAmount: b.settledOnSave,
                }
              : {
                  saleDate: b.date,
                  buyer: party,
                  totalCharges: "0.00",
                  receivedAmount: b.settledOnSave,
                }),
            grossAmount: b.netAmount,
            rounding: "0.00",
            netAmount: b.netAmount,
            outstanding: outstandingOf(b).toFixed(2),
            status: "posted",
            notes: null,
            createdAt: `${b.date}T05:00:00.000Z`,
            updatedAt: `${b.date}T05:00:00.000Z`,
          };
        });
      return {
        status: 200,
        body: { data: rows, meta: { page: 1, limit: 100, total: rows.length } },
      };
    });
  }

  await mockEndpoint(page, "GET", "/ledger/**", (request) => {
    const traderId = new URL(request.url()).pathname.split("/")[2];
    const trader = traders.find((t) => t.id === traderId)!;
    const { data, balance } = khata(traderId);
    return {
      status: 200,
      body: {
        trader: { id: trader.id, type: trader.type, name: trader.name },
        from: null,
        to: null,
        openingBalance: "0.00",
        closingBalance: balance.toFixed(2),
        data,
        meta: { page: 1, limit: 100, total: data.length },
      },
    };
  });

  await page.route(`${API}/payments**`, async (route: Route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
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
    const q = url.searchParams;

    if (request.method() === "POST" && !id) {
      posts.push(request);
      const key = (await request.headerValue("idempotency-key")) ?? "";
      const known = byKey.get(key);
      if (known) {
        await reply(200, { ...known, warnings: [] });
        return;
      }
      const body = request.postDataJSON() as Body;
      const out = body.direction === "paid";
      const n = out ? ++paid : ++received;
      const trader = traders.find((t) => t.id === body.traderId)!;
      let left = new Decimal(body.amount);
      const allocations = (body.allocations ?? []).map((a, i) => {
        const bill = bills.find((b) => b.id === (a.purchaseId ?? a.saleId))!;
        const share = a.amount
          ? new Decimal(a.amount)
          : Decimal.min(outstandingOf(bill), left);
        left = left.minus(share);
        return {
          id: `eeeeeeee-9999-4999-8999-99999999${n}${i}${out ? 1 : 2}0`,
          purchaseId: out ? bill.id : null,
          saleId: out ? null : bill.id,
          billNo: bill.billNo,
          billDate: bill.date,
          amount: share.toFixed(2),
        };
      });
      const allocated = new Decimal(body.amount).minus(left);
      const voucher: Voucher = {
        id: `dddddddd-8888-4888-8888-88888888888${out ? 1 : 5}${n}`.slice(
          0,
          36,
        ),
        voucherNo: `${out ? "PAY" : "RCT"}-2026-27-00000${n}`,
        direction: body.direction,
        paymentDate: body.paymentDate ?? TODAY,
        trader: { id: trader.id, name: trader.name },
        amount: new Decimal(body.amount).toFixed(2),
        allocated: allocated.toFixed(2),
        advance: left.toFixed(2),
        method: body.method,
        reference: body.reference ?? null,
        status: "posted",
        notes: body.notes ?? null,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
        createdBy: "u1",
        allocations,
      };
      vouchers.push(voucher);
      byKey.set(key, voucher);
      await reply(201, { ...voucher, warnings: [] });
      return;
    }

    if (request.method() === "GET" && id === "cash-book") {
      const to = q.get("to") ?? TODAY;
      const from = q.get("from") ?? to;
      const cash = vouchers.filter(
        (v) => v.status === "posted" && v.method === "cash",
      );
      const signed = (v: Voucher) =>
        v.direction === "received"
          ? new Decimal(v.amount)
          : new Decimal(v.amount).negated();
      const opening = cash
        .filter((v) => v.paymentDate < from)
        .reduce((sum, v) => sum.plus(signed(v)), new Decimal(0));
      const dates = [
        ...new Set(
          cash
            .filter((v) => v.paymentDate >= from && v.paymentDate <= to)
            .map((v) => v.paymentDate),
        ),
      ].sort();
      let running = opening;
      let totalIn = new Decimal(0);
      let totalOut = new Decimal(0);
      const days = dates.map((date) => {
        const ofDay = cash.filter((v) => v.paymentDate === date);
        const cashIn = ofDay
          .filter((v) => v.direction === "received")
          .reduce((s, v) => s.plus(v.amount), new Decimal(0));
        const cashOut = ofDay
          .filter((v) => v.direction === "paid")
          .reduce((s, v) => s.plus(v.amount), new Decimal(0));
        running = running.plus(cashIn).minus(cashOut);
        totalIn = totalIn.plus(cashIn);
        totalOut = totalOut.plus(cashOut);
        return {
          date,
          cashIn: cashIn.toFixed(2),
          cashOut: cashOut.toFixed(2),
          closingCash: running.toFixed(2),
        };
      });
      await reply(200, {
        from,
        to,
        openingCash: opening.toFixed(2),
        days,
        totals: { cashIn: totalIn.toFixed(2), cashOut: totalOut.toFixed(2) },
        closingCash: running.toFixed(2),
      });
      return;
    }

    if (request.method() === "GET" && id) {
      const voucher = vouchers.find((v) => v.id === id);
      await (voucher
        ? reply(200, voucher)
        : reply(404, { statusCode: 404, message: "Not found" }));
      return;
    }

    if (request.method() === "GET") {
      const from = q.get("from");
      const to = q.get("to");
      const data = vouchers
        .filter(
          (v) =>
            (!from || v.paymentDate >= from) &&
            (!to || v.paymentDate <= to) &&
            (!q.get("method") || v.method === q.get("method")) &&
            (!q.get("status") || v.status === q.get("status")),
        )
        .map((v) => {
          const row: Partial<Voucher> = { ...v };
          delete row.allocations;
          delete row.createdBy;
          return row;
        });
      await reply(200, {
        data,
        meta: { page: 1, limit: 50, total: data.length },
      });
      return;
    }
    await route.fallback();
  });

  return { posts, vouchers };
}

const printed = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          printed: { paper: string; lang: string; text: string }[];
        }
      ).printed,
  );

const share = (page: Page, billNo: string) =>
  page.getByRole("textbox", { name: `Allocate to ${billNo}` });

test.describe("Payments", () => {
  test("payment → khata → cash book: a kissan paid in cash settles his oldest bills, shows in his khata and closes the day's cash", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await shopApi(page);

    // The cash book opens on today: Rs 70,000 in hand from yesterday.
    await page.goto("/payments");
    await expect(page.getByTestId("cash-opening")).toHaveText("Rs 70,000.00");
    await expect(page.getByTestId("cash-closing")).toHaveText("Rs 70,000.00");
    await expect(
      page.getByText("No cash vouchers on these days."),
    ).toBeVisible();

    // Pay kissan: his outstanding bills, oldest first.
    await page.getByRole("link", { name: "Pay kissan" }).click();
    await expect(page).toHaveURL(/\/payments\/new\?direction=paid$/);
    await expect(page.getByRole("combobox", { name: "Kissan" })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.type("Raf");
    await page.getByRole("option", { name: /Rafiq Ahmad/ }).click();
    const rows = page.getByTestId("allocation-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute(
      "data-bill",
      "PUR-2026-27-000001",
    );
    await expect(rows.nth(0)).toContainText("Rs 30,000.00");
    await expect(rows.nth(1)).toHaveAttribute(
      "data-bill",
      "PUR-2026-27-000002",
    );
    await expect(page.getByTestId("payment-trader-balance")).toHaveText(
      "Khata balance: Rs 110,000.00 payable",
    );

    // Rs 50,000 is allocated automatically: PUR-1 in full, 20,000 to PUR-2.
    await page.getByLabel("Amount (Rs)").fill("50000");
    await expect(share(page, "PUR-2026-27-000001")).toHaveValue("30000.00");
    await expect(share(page, "PUR-2026-27-000002")).toHaveValue("20000.00");
    await expect(page.getByTestId("payment-allocated")).toHaveText(
      "Rs 50,000.00",
    );
    await expect(page.getByTestId("payment-advance")).toHaveText("Rs 0.00");
    expect(api.posts).toHaveLength(0);

    // Ctrl+P: save and print the voucher.
    await page.keyboard.press("Control+p");
    await expect(page).toHaveURL(/\/payments\/dddddddd-[0-9a-f-]+$/);
    expect(api.posts).toHaveLength(1);
    expect(api.posts[0].headers()["idempotency-key"]).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    expect(api.posts[0].postDataJSON()).toEqual({
      direction: "paid",
      traderId: rafiq.id,
      paymentDate: TODAY,
      amount: "50000",
      method: "cash",
      reference: null,
      notes: null,
      allocations: [{ purchaseId: bills[0].id }, { purchaseId: bills[1].id }],
    });
    await expect(
      page.getByText("Payment saved: PAY-2026-27-000001"),
    ).toBeVisible();

    const voucher = page.getByRole("article", {
      name: "Payment voucher PAY-2026-27-000001",
    });
    await expect(voucher).toBeVisible();
    await expect(voucher.getByTestId("voucher-amount")).toHaveText(
      "Rs 50,000.00",
    );
    await expect(voucher.getByTestId("voucher-bills")).toContainText(
      "PUR-2026-27-000002",
    );
    await expect.poll(async () => (await printed(page)).length).toBe(1);
    const [first] = await printed(page);
    expect(first).toMatchObject({ paper: "a4", lang: "en" });
    expect(first.text).toContain("PAY-2026-27-000001");
    expect(first.text).toContain("Rs 50,000.00");

    // Again on the 80 mm roll in Urdu.
    await page.getByRole("combobox", { name: "Paper" }).click();
    await page.getByRole("option", { name: "80 mm thermal" }).click();
    await page.getByRole("combobox", { name: "Parchi language" }).click();
    await page.getByRole("option", { name: "اردو" }).click();
    await page.getByRole("button", { name: "Print voucher" }).click();
    await expect.poll(async () => (await printed(page)).length).toBe(2);
    expect((await printed(page))[1]).toMatchObject({
      paper: "thermal80",
      lang: "ur",
    });

    // The khata: the payment is a debit; the shop now owes Rs 60,000.
    await page.getByRole("link", { name: "Open khata" }).click();
    await expect(page).toHaveURL(`/ledger?trader=${rafiq.id}`);
    await expect(page.getByTestId("khata-closing")).toContainText(
      "Rs 60,000.00 Cr",
    );
    const line = page
      .getByRole("table")
      .getByRole("row")
      .filter({ hasText: "Payment PAY-2026-27-000001" });
    await expect(line).toContainText("Rs 50,000.00");
    // …and opens its voucher (now in Urdu, the last choice).
    await line
      .getByRole("link", { name: "Open Payment PAY-2026-27-000001" })
      .click();
    await expect(page).toHaveURL(/\/payments\/dddddddd-/);
    await expect(
      page.getByRole("article", { name: /PAY-2026-27-000001$/ }),
    ).toHaveAttribute("lang", "ur");

    // A receipt from the beopari, in cash too.
    await page.goto("/payments/new?direction=received");
    await page.getByRole("combobox", { name: "Beopari" }).click();
    await page.getByRole("option", { name: /Shahid Traders/ }).click();
    await expect(page.getByTestId("allocation-row")).toHaveCount(1);
    await page.getByLabel("Amount (Rs)").fill("20000");
    await expect(share(page, "SAL-2026-27-000001")).toHaveValue("20000.00");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("article", { name: /RCT-2026-27-000001$/ }),
    ).toBeVisible();

    // Today's cash book: the sum of today's cash payments and receipts.
    await page.getByRole("link", { name: "Cash book" }).click();
    await expect(page).toHaveURL(/\/payments\?from=2026-11-06&to=2026-11-06$/);
    await expect(page.getByTestId("cash-opening")).toHaveText("Rs 70,000.00");
    await expect(page.getByTestId("cash-in")).toContainText("Rs 20,000.00");
    await expect(page.getByTestId("cash-out")).toContainText("Rs 50,000.00");
    // 70,000 + 20,000 − 50,000: the cash to count in the drawer.
    await expect(page.getByTestId("cash-closing")).toHaveText("Rs 40,000.00");
    const cashVouchers = page.getByRole("table", { name: "Cash vouchers" });
    await expect(cashVouchers.getByRole("row")).toHaveCount(3);
    await expect(
      cashVouchers.getByRole("row", { name: /PAY-2026-27-000001/ }),
    ).toContainText("Rafiq Ahmad—Rs 50,000.00");
    await expect(
      cashVouchers.getByRole("row", { name: /RCT-2026-27-000001/ }),
    ).toContainText("Shahid TradersRs 20,000.00—");

    // The bills now show what is left: PUR-2 has Rs 60,000 outstanding.
    await page.getByRole("link", { name: "Pay kissan" }).click();
    await page.getByRole("combobox", { name: "Kissan" }).click();
    await page.getByRole("option", { name: /Rafiq Ahmad/ }).click();
    await expect(page.getByTestId("allocation-row")).toHaveCount(1);
    await expect(page.getByTestId("allocation-row")).toContainText(
      "Rs 60,000.00",
    );
  });

  test("yesterday's cash book carries into today's opening", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    await shopApi(page);
    await page.goto("/payments");
    await page.getByRole("button", { name: "Previous day" }).click();
    await expect(page).toHaveURL(/from=2026-11-05&to=2026-11-05/);
    await expect(page.getByTestId("cash-opening")).toHaveText("Rs 0.00");
    await expect(page.getByTestId("cash-in")).toContainText("Rs 70,000.00");
    await expect(page.getByTestId("cash-closing")).toHaveText("Rs 70,000.00");
    await page.getByRole("button", { name: "Next day" }).click();
    await expect(page.getByTestId("cash-opening")).toHaveText("Rs 70,000.00");
    await expect(page.getByRole("button", { name: "Next day" })).toBeDisabled();
  });
});
