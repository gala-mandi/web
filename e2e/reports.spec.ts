import {
  type BrowserContext,
  expect,
  type Page,
  type Request,
  test,
} from "@playwright/test";
import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";
import { dailySummary } from "../src/features/dashboard/test-data";
import {
  bookOfRange,
  cashBookOfRange,
  commissionOfRange,
  commodities,
  fullOutstanding,
  MONTH_FROM,
  monthPurchasesByCommodity,
  monthPurchasesByTrader,
  TODAY,
} from "../src/features/reports/test-data";
import {
  purchasesByDay,
  salesByDay,
} from "../src/features/dashboard/test-data";
import { formatRs } from "../src/lib/format";
import {
  mockEndpoint,
  operator,
  owner,
  session,
  setRefreshCookie,
  shopSettings,
} from "./mock-api";

/** 12:00 in Karachi on TODAY (Friday 6 Nov 2026). */
const NOW = new Date(`${TODAY}T07:00:00Z`);

const params = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams);

async function signedIn(page: Page, context: BrowserContext, user: object) {
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
  await mockEndpoint(page, "GET", "/commodities**", () => ({
    status: 200,
    body: {
      data: commodities,
      meta: { page: 1, limit: 100, total: commodities.length },
    },
  }));
  // react-to-print prints from its own iframe: record what that frame would
  // print (the report, its totals rows) instead of opening the dialog.
  await page.addInitScript(() => {
    type Printed = { report: string; title: string; totals: string[] };
    const top = window.top as unknown as { printed?: Printed[] };
    if (window === window.top) top.printed = [];
    window.print = () => {
      const doc = document.querySelector<HTMLElement>("[data-report-document]");
      top.printed?.push({
        report: doc?.dataset.reportDocument ?? "",
        // react-to-print names the print after the page's own title.
        title: window.top?.document.title ?? "",
        totals: [...document.querySelectorAll("[data-print-totals]")].map(
          (row) => row.textContent ?? "",
        ),
      });
    };
  });
}

/** The reports API of server ticket 30, answering for any range. */
async function mockReports(page: Page) {
  const range = (request: Request) => {
    const q = params(request);
    const to = q.to ?? TODAY;
    return { from: q.from ?? to, to };
  };
  return {
    daily: await mockEndpoint(page, "GET", "/reports/daily-summary**", () => ({
      status: 200,
      body: dailySummary,
    })),
    purchases: await mockEndpoint(
      page,
      "GET",
      "/reports/purchases**",
      (request) => {
        const groupBy = params(request).groupBy;
        if (groupBy === "commodity") {
          return { status: 200, body: monthPurchasesByCommodity };
        }
        if (groupBy === "trader") {
          return { status: 200, body: monthPurchasesByTrader };
        }
        const { from, to } = range(request);
        return { status: 200, body: bookOfRange(purchasesByDay, from, to) };
      },
    ),
    sales: await mockEndpoint(page, "GET", "/reports/sales**", (request) => {
      const { from, to } = range(request);
      return { status: 200, body: bookOfRange(salesByDay, from, to) };
    }),
    commission: await mockEndpoint(
      page,
      "GET",
      "/reports/commission**",
      (request) => {
        const { from, to } = range(request);
        return { status: 200, body: commissionOfRange(from, to) };
      },
    ),
    outstanding: await mockEndpoint(
      page,
      "GET",
      "/reports/outstanding**",
      () => ({ status: 200, body: fullOutstanding }),
    ),
    cashBook: await mockEndpoint(
      page,
      "GET",
      "/reports/cash-book**",
      (request) => {
        const { from, to } = range(request);
        return { status: 200, body: cashBookOfRange(from, to) };
      },
    ),
  };
}

const printed = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          printed: { report: string; title: string; totals: string[] }[];
        }
      ).printed,
  );

/** Downloads the report's Excel file and reads it back with SheetJS. */
async function downloadExcel(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel" }).click();
  const file = await download;
  const book = XLSX.read(await readFile(await file.path()), { cellNF: true });
  const ws = book.Sheets[book.SheetNames[0]];
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const rows: (XLSX.CellObject | undefined)[][] = [];
  for (let r = 0; r <= range.e.r; r += 1) {
    rows.push(
      Array.from(
        { length: range.e.c + 1 },
        (_, c) =>
          ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined,
      ),
    );
  }
  const totals = rows.filter((row) =>
    String(row[0]?.v ?? "").startsWith("Total"),
  );
  return {
    name: file.suggestedFilename(),
    sheet: book.SheetNames[0],
    rows,
    totals,
  };
}

/** The text of the totals row (footer) of the table named `caption`. */
const footer = (page: Page, caption: string) =>
  page.getByRole("table", { name: caption }).locator("tfoot tr");

test.describe("reports", () => {
  test("the hub opens each report", async ({ page, context }) => {
    await signedIn(page, context, owner);
    await mockReports(page);
    await page.goto("/reports");
    await expect(
      page.getByRole("heading", { level: 1, name: "Reports" }),
    ).toBeVisible();
    const reports = [
      ["Daily summary", "/reports/daily-summary"],
      ["Purchases", "/reports/purchases"],
      ["Sales", "/reports/sales"],
      ["Commission", "/reports/commission"],
      ["Outstanding", "/reports/outstanding"],
      ["Cash book", "/reports/cash-book"],
    ] as const;
    for (const [title, href] of reports) {
      await page
        .getByRole("link", { name: `Open the ${title} report` })
        .click();
      await expect(page).toHaveURL(href);
      await expect(
        page.getByRole("heading", { level: 1, name: title }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Excel" })).toBeEnabled();
      await page.getByRole("link", { name: "Reports" }).first().click();
      await expect(page).toHaveURL("/reports");
    }
  });

  test("purchases: totals on screen, in Excel (with Rs and kg formats) and on paper match the server", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await mockReports(page);
    await page.goto("/reports/purchases");
    const report = bookOfRange(purchasesByDay, MONTH_FROM, TODAY);
    const totals = report.totals;

    const row = footer(page, "Purchases by group");
    await expect(row).toContainText(formatRs(totals.grossAmount));
    await expect(row).toContainText(formatRs(totals.totalDeductions));
    await expect(row).toContainText(formatRs(totals.netAmount));
    expect(params(api.purchases[0])).toEqual({
      from: MONTH_FROM,
      to: TODAY,
      groupBy: "day",
    });

    const excel = await downloadExcel(page);
    expect(excel.name).toBe(`purchases-report-${MONTH_FROM}_${TODAY}.xlsx`);
    expect(excel.sheet).toBe("Purchases");
    expect(excel.rows[0][0]?.v).toBe("Purchases report");
    expect(excel.rows[1].map((c) => c?.v)).toContain("Demo Mandi");
    const heading = excel.rows.find((r) => r[0]?.v === "Date") ?? [];
    expect(heading.map((c) => c?.v)).toEqual([
      "Date",
      "Bills",
      "Bags",
      "Weight (kg)",
      "Gross (Rs)",
      "Deductions (Rs)",
      "Net (Rs)",
    ]);
    const [total] = excel.totals;
    expect(total.map((c) => c?.v)).toEqual([
      "Total",
      totals.bills,
      totals.bags,
      Number(totals.weightKg),
      Number(totals.grossAmount),
      Number(totals.totalDeductions),
      Number(totals.netAmount),
    ]);
    expect(total[3]?.z).toBe("#,##0.000");
    expect(total.slice(4).map((c) => c?.z)).toEqual([
      "#,##0.00",
      "#,##0.00",
      "#,##0.00",
    ]);
    // The Excel totals read back as the page's totals row.
    await expect(row).toContainText(formatRs(String(total[6]?.v)));

    await page.getByRole("button", { name: "Print" }).click();
    await expect.poll(async () => (await printed(page)).length).toBe(1);
    const [paper] = await printed(page);
    expect(paper.report).toBe("purchases");
    expect(paper.totals[0]).toContain(formatRs(totals.netAmount));

    await page.getByRole("button", { name: "PDF" }).click();
    await expect(page.getByText(/Choose “Save as PDF”/)).toBeVisible();
    await expect.poll(async () => (await printed(page)).length).toBe(2);
    expect((await printed(page))[1].title).toBe(
      `purchases-report-${MONTH_FROM}_${TODAY}`,
    );
  });

  test("purchases by commodity and by kissan; the filters stay in the URL", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await mockReports(page);
    await page.goto("/reports/purchases");
    await page.getByRole("combobox", { name: "Group by" }).click();
    await page.getByRole("option", { name: "Commodity" }).click();
    await expect(page).toHaveURL(/groupBy=commodity/);
    const table = page.getByRole("table", { name: "Purchases by group" });
    await expect(table).toContainText("گندم");
    await expect(table.getByRole("columnheader")).toHaveText([
      "Commodity",
      "Bills",
      "Bags",
      "Weight",
      "Gross",
    ]);
    const excel = await downloadExcel(page);
    expect(excel.totals[0].map((c) => c?.v)).toEqual([
      "Total",
      monthPurchasesByCommodity.totals.bills,
      monthPurchasesByCommodity.totals.bags,
      Number(monthPurchasesByCommodity.totals.weightKg),
      Number(monthPurchasesByCommodity.totals.grossAmount),
    ]);

    await page.reload();
    await expect(table).toContainText("Gandum");
    await page.getByRole("combobox", { name: "Group by" }).click();
    await page.getByRole("option", { name: "Trader" }).click();
    await expect(table.getByRole("columnheader").first()).toHaveText("Kissan");
    await expect(footer(page, "Purchases by group")).toContainText(
      formatRs(monthPurchasesByTrader.totals.netAmount),
    );
    expect(params(api.purchases.at(-1) as Request).groupBy).toBe("trader");
  });

  test("date presets: this month by default, today, this week, and a custom range that survives a reload", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await mockReports(page);
    await page.goto("/reports/sales");
    const presets = page.getByRole("group", { name: "Date range" });
    await expect(
      presets.getByRole("button", { name: "This month" }),
    ).toHaveAttribute("aria-pressed", "true");

    await presets.getByRole("button", { name: "Today" }).click();
    await expect(page).toHaveURL(`/reports/sales?from=${TODAY}&to=${TODAY}`);
    await presets.getByRole("button", { name: "This week" }).click();
    await expect(page).toHaveURL(`/reports/sales?from=2026-11-02&to=${TODAY}`);
    const week = bookOfRange(salesByDay, "2026-11-02", TODAY);
    await expect(footer(page, "Sales by group")).toContainText(
      formatRs(week.totals.netAmount),
    );

    await page.getByRole("button", { name: /^Custom/ }).click();
    await page.getByLabel("From", { exact: true }).fill("2026-10-12");
    await page.getByLabel("To", { exact: true }).fill("2026-10-25");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(
      "/reports/sales?from=2026-10-12&to=2026-10-25",
    );
    await page.reload();
    const custom = bookOfRange(salesByDay, "2026-10-12", "2026-10-25");
    await expect(footer(page, "Sales by group")).toContainText(
      formatRs(custom.totals.netAmount),
    );
    for (const name of ["Today", "This week", "This month"]) {
      await expect(presets.getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
    expect(params(api.sales.at(-1) as Request)).toMatchObject({
      from: "2026-10-12",
      to: "2026-10-25",
    });
  });

  test("commission, outstanding and cash book export their server totals", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    await mockReports(page);

    await page.goto("/reports/commission");
    const commission = commissionOfRange(MONTH_FROM, TODAY);
    await expect(footer(page, "Commission per day")).toContainText(
      formatRs(commission.totals.total),
    );
    let excel = await downloadExcel(page);
    expect(excel.totals[0].map((c) => c?.v)).toEqual([
      "Total",
      Number(commission.totals.purchases),
      Number(commission.totals.sales),
      Number(commission.totals.total),
    ]);

    await page.goto("/reports/outstanding");
    await expect(footer(page, "Traders who owe the shop")).toContainText(
      formatRs(fullOutstanding.receivable.total),
    );
    excel = await downloadExcel(page);
    expect(excel.name).toBe(`outstanding-report-${TODAY}.xlsx`);
    expect(excel.totals.map((row) => [row[0]?.v, row[3]?.v])).toEqual([
      ["Total · 12 traders", Number(fullOutstanding.receivable.total)],
      ["Total · 8 traders", Number(fullOutstanding.payable.total)],
    ]);
    await page
      .getByRole("link", { name: "Open Malik Traders’s khata" })
      .click();
    await expect(page).toHaveURL(/\/ledger\?trader=/);

    await page.goto("/reports/cash-book");
    const book = cashBookOfRange(MONTH_FROM, TODAY);
    await expect(page.getByTestId("cash-closing")).toHaveText(
      formatRs(book.closingCash),
    );
    excel = await downloadExcel(page);
    expect(excel.totals[0].map((c) => c?.v)).toEqual([
      "Total",
      Number(book.openingCash),
      Number(book.totals.cashIn),
      Number(book.totals.cashOut),
      Number(book.closingCash),
    ]);
    await page.getByRole("button", { name: "Print" }).click();
    await expect.poll(async () => (await printed(page)).length).toBe(1);
    expect((await printed(page))[0].totals[0]).toContain(
      formatRs(book.closingCash),
    );
  });

  test("daily summary: the day's figures, printed and exported", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await mockReports(page);
    await page.goto("/reports/daily-summary");
    await expect(page.locator('[data-tile="cash"]')).toContainText(
      formatRs(dailySummary.cash.closingCash),
    );
    expect(params(api.daily[0])).toEqual({ date: TODAY });
    const excel = await downloadExcel(page);
    expect(excel.name).toBe(`daily-summary-${TODAY}.xlsx`);
    const closing = excel.rows.find((r) => r[0]?.v === "Cash in hand (Rs)");
    expect(closing?.[1]).toMatchObject({
      v: Number(dailySummary.cash.closingCash),
      z: "#,##0.00",
    });
    await page.getByRole("button", { name: "Previous day" }).click();
    await expect(page).toHaveURL("/reports/daily-summary?date=2026-11-05");
    await expect
      .poll(() => params(api.daily.at(-1) as Request).date)
      .toBe("2026-11-05");
    await page.getByRole("button", { name: "Print" }).click();
    await expect.poll(async () => (await printed(page)).length).toBe(1);
    expect((await printed(page))[0].report).toBe("daily-summary");
  });

  test("operators get the 403 state on every report", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, operator);
    const api = await mockReports(page);
    for (const path of [
      "/reports",
      "/reports/purchases",
      "/reports/cash-book",
    ]) {
      await page.goto(path);
      await expect(page.getByText("You don’t have access")).toBeVisible();
    }
    expect(api.purchases).toHaveLength(0);
    expect(api.cashBook).toHaveLength(0);
  });
});
