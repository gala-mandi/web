import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { listCommodities } from "@/features/commodities/api";
import {
  getCashBookReport,
  getCommissionReport,
  getDailySummary,
  getOutstanding,
  getPurchasesReport,
  getSalesReport,
} from "@/features/dashboard/api";
import { dailySummary, emptyShop } from "@/features/dashboard/test-data";
import { getSettings } from "@/features/settings/api";
import { shopSettings } from "@/features/settings/test-data";
import { formatRs } from "@/lib/format";
import { useSessionStore } from "@/stores/session";
import { httpError, manager, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { exportReportToExcel } from "../excel";
import {
  commodities,
  emptyBook,
  emptyCashBook,
  emptyCommission,
  emptyOutstanding,
  fullOutstanding,
  monthCashBook,
  monthCommission,
  monthPurchases,
  monthPurchasesByCommodity,
  monthSales,
  MONTH_FROM,
  TODAY,
  WEEK_FROM,
} from "../test-data";
import { BookReportPage } from "./book-report";
import { CashBookReportPage } from "./cash-book-report";
import { CommissionReportPage } from "./commission-report";
import { DailySummaryReportPage } from "./daily-summary-report";
import { OutstandingReportPage } from "./outstanding-report";
import { ReportsHub } from "./reports-hub";

vi.mock("@/features/dashboard/api", () => ({
  getDailySummary: vi.fn(),
  getPurchasesReport: vi.fn(),
  getSalesReport: vi.fn(),
  getCommissionReport: vi.fn(),
  getOutstanding: vi.fn(),
  getCashBookReport: vi.fn(),
}));
vi.mock("@/features/commodities/api", () => ({
  listCommodities: vi.fn(),
  lookupCommodities: vi.fn(),
}));
vi.mock("@/features/settings/api", () => ({ getSettings: vi.fn() }));
vi.mock("@/features/traders/api", () => ({
  getTrader: vi.fn(),
  lookupTraders: vi.fn().mockResolvedValue({ data: [] }),
}));
const print = vi.hoisted(() => vi.fn());
vi.mock("react-to-print", () => ({ useReactToPrint: () => print }));
vi.mock("../excel", async (load) => ({
  ...(await load<typeof import("../excel")>()),
  exportReportToExcel: vi.fn().mockResolvedValue(undefined),
}));

function renderPage(page: ReactNode, user: User = owner, searchParams = "") {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  render(
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={onUrlUpdate}
      hasMemory
    >
      <TestProviders>{page}</TestProviders>
    </NuqsTestingAdapter>,
  );
  return { onUrlUpdate };
}

const never = () => new Promise<never>(() => {});

/** The totals row (the table's footer) of the table named `caption`. */
async function footer(caption: string) {
  const table = await screen.findByRole("table", { name: caption });
  const rows = within(table).getAllByRole("row");
  return rows[rows.length - 1];
}

beforeEach(() => {
  // 12:00 on 6 Nov 2026 (a Friday) in Karachi; only Date is faked.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-06T07:00:00.000Z"));
  print.mockReset();
  vi.mocked(exportReportToExcel).mockClear();
  vi.mocked(getSettings).mockResolvedValue(shopSettings());
  vi.mocked(listCommodities).mockResolvedValue({
    data: commodities,
    meta: { page: 1, limit: 100, total: commodities.length },
  } as never);
  vi.mocked(getDailySummary).mockResolvedValue(dailySummary);
  vi.mocked(getPurchasesReport).mockResolvedValue(monthPurchases);
  vi.mocked(getSalesReport).mockResolvedValue(monthSales);
  vi.mocked(getCommissionReport).mockResolvedValue(monthCommission);
  vi.mocked(getOutstanding).mockResolvedValue(fullOutstanding);
  vi.mocked(getCashBookReport).mockResolvedValue(monthCashBook);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  useSessionStore.getState().clear();
});

describe("ReportsHub", () => {
  it("links to the six reports", () => {
    renderPage(<ReportsHub />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Reports" }),
    ).toBeInTheDocument();
    const links = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(links).toEqual([
      "/reports/daily-summary",
      "/reports/purchases",
      "/reports/sales",
      "/reports/commission",
      "/reports/outstanding",
      "/reports/cash-book",
    ]);
    expect(
      screen.getByRole("link", { name: "Open the Cash book report" }),
    ).toBeInTheDocument();
  });

  it("operators get the 403 state", () => {
    renderPage(<ReportsHub />, operator);
    expect(screen.getByText("You don’t have access")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Open the / })).toBeNull();
  });
});

/** Every report page: the call it makes and its empty answer. */
const pages = [
  {
    name: "Daily summary",
    page: <DailySummaryReportPage />,
    api: getDailySummary,
    empty: () =>
      vi.mocked(getDailySummary).mockResolvedValue(emptyShop.summary),
    emptyText: "No rates saved for this day.",
  },
  {
    name: "Purchases",
    page: <BookReportPage kind="purchases" />,
    api: getPurchasesReport,
    empty: () => vi.mocked(getPurchasesReport).mockResolvedValue(emptyBook),
    emptyText: "No posted purchases on these dates.",
  },
  {
    name: "Sales",
    page: <BookReportPage kind="sales" />,
    api: getSalesReport,
    empty: () => vi.mocked(getSalesReport).mockResolvedValue(emptyBook),
    emptyText: "No posted sales on these dates.",
  },
  {
    name: "Commission",
    page: <CommissionReportPage />,
    api: getCommissionReport,
    empty: () =>
      vi.mocked(getCommissionReport).mockResolvedValue(emptyCommission),
    emptyText: "No commission on these dates.",
  },
  {
    name: "Outstanding",
    page: <OutstandingReportPage />,
    api: getOutstanding,
    empty: () => vi.mocked(getOutstanding).mockResolvedValue(emptyOutstanding),
    emptyText: "No one owes the shop money.",
  },
  {
    name: "Cash book",
    page: <CashBookReportPage />,
    api: getCashBookReport,
    empty: () => vi.mocked(getCashBookReport).mockResolvedValue(emptyCashBook),
    emptyText: "No cash vouchers on these days.",
  },
] as const;

describe.each(pages)(
  "$name report states",
  ({ page, api, empty, emptyText }) => {
    it("shows a loading state, with the export buttons waiting", async () => {
      vi.mocked(api).mockImplementation(never);
      renderPage(page);
      expect(
        await screen.findByText("Loading the report…"),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Excel" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "PDF" })).toBeDisabled();
    });

    it("shows the empty state", async () => {
      empty();
      renderPage(page);
      expect(await screen.findByText(emptyText)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Excel" })).toBeEnabled();
    });

    it("shows an error with a retry", async () => {
      // Offline twice: the first try and its one automatic retry.
      vi.mocked(api)
        .mockRejectedValueOnce(new Error("offline"))
        .mockRejectedValueOnce(new Error("offline"));
      renderPage(page);
      const alert = await screen.findByRole("alert", {}, { timeout: 4000 });
      expect(alert).toHaveTextContent("Couldn’t load the report");
      expect(screen.getByRole("button", { name: "Excel" })).toBeDisabled();
      fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
      await waitFor(() => expect(api).toHaveBeenCalledTimes(3));
      expect((await screen.findAllByRole("table")).length).toBeGreaterThan(0);
    });

    it("shows the 403 state when the server refuses", async () => {
      vi.mocked(api).mockRejectedValue(httpError(undefined, 403));
      renderPage(page, manager);
      expect(
        await screen.findByText("You don’t have access"),
      ).toBeInTheDocument();
    });

    it("operators get the 403 state without asking the server", () => {
      renderPage(page, operator);
      expect(screen.getByText("You don’t have access")).toBeInTheDocument();
      expect(api).not.toHaveBeenCalled();
    });

    it("prints, saves as PDF and exports to Excel what is on screen", async () => {
      renderPage(page);
      await screen.findAllByRole("table");
      fireEvent.click(screen.getByRole("button", { name: "Print" }));
      await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole("button", { name: "PDF" }));
      await waitFor(() => expect(print).toHaveBeenCalledTimes(2));
      expect(
        await screen.findByText(/Choose “Save as PDF” as the printer/),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Excel" }));
      await waitFor(() => expect(exportReportToExcel).toHaveBeenCalledTimes(1));
      expect(vi.mocked(exportReportToExcel).mock.calls[0][1]).toBe(
        "Demo Mandi",
      );
    });
  },
);

describe("date presets", () => {
  it("open on this month and move to today, this week or a custom range", async () => {
    const { onUrlUpdate } = renderPage(<CommissionReportPage />);
    await screen.findAllByRole("table");
    expect(getCommissionReport).toHaveBeenCalledWith(
      { from: MONTH_FROM, to: TODAY },
      expect.anything(),
    );
    const group = screen.getByRole("group", { name: "Date range" });
    expect(
      within(group).getByRole("button", { name: "This month" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(group).getByRole("button", { name: "This week" }));
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
        `?from=${WEEK_FROM}&to=${TODAY}`,
      ),
    );
    await waitFor(() =>
      expect(getCommissionReport).toHaveBeenLastCalledWith(
        { from: WEEK_FROM, to: TODAY },
        expect.anything(),
      ),
    );
    expect(
      within(group).getByRole("button", { name: "This week" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(group).getByRole("button", { name: "Today" }));
    await waitFor(() =>
      expect(getCommissionReport).toHaveBeenLastCalledWith(
        { from: TODAY, to: TODAY },
        expect.anything(),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /^Custom/ }));
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-10-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(getCommissionReport).toHaveBeenLastCalledWith(
        { from: "2026-10-01", to: "2026-10-31" },
        expect.anything(),
      ),
    );
    for (const name of ["Today", "This week", "This month"]) {
      expect(within(group).getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });

  it("a shared link opens its own range", async () => {
    renderPage(<CashBookReportPage />, owner, "?from=2026-10-01&to=2026-10-31");
    await screen.findByTestId("cash-closing");
    expect(getCashBookReport).toHaveBeenCalledWith(
      { from: "2026-10-01", to: "2026-10-31" },
      expect.anything(),
    );
  });

  it("shows the server's reason for a range it refuses", async () => {
    vi.mocked(getCommissionReport).mockRejectedValue(
      httpError(undefined, 400, {
        errors: [{ field: "to", message: "Choose at most 366 days" }],
      }),
    );
    renderPage(
      <CommissionReportPage />,
      owner,
      "?from=2024-01-01&to=2026-11-06",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose at most 366 days",
    );
  });
});

describe("report figures", () => {
  it("purchases: cards and the totals row are the server's totals", async () => {
    renderPage(<BookReportPage kind="purchases" />);
    const totals = monthPurchases.totals;
    const row = await footer("Purchases by group");
    expect(row).toHaveTextContent(
      [
        "Total",
        totals.bills.toLocaleString("en-PK"),
        totals.bags.toLocaleString("en-PK"),
      ].join(""),
    );
    expect(row).toHaveTextContent(formatRs(totals.grossAmount));
    expect(row).toHaveTextContent(formatRs(totals.totalDeductions));
    expect(row).toHaveTextContent(formatRs(totals.netAmount));
    const cards = within(screen.getByTestId("report-cards"));
    expect(cards.getByText(formatRs(totals.netAmount))).toBeInTheDocument();
    expect(cards.getByText(formatRs(totals.grossAmount))).toBeInTheDocument();
  });

  it("purchases by commodity: Urdu names, no bill-level columns", async () => {
    vi.mocked(getPurchasesReport).mockResolvedValue(monthPurchasesByCommodity);
    const { onUrlUpdate } = renderPage(<BookReportPage kind="purchases" />);
    await screen.findAllByRole("table");
    fireEvent.click(screen.getByRole("combobox", { name: "Group by" }));
    fireEvent.click(await screen.findByRole("option", { name: "Commodity" }));
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
        "?groupBy=commodity",
      ),
    );
    await waitFor(() =>
      expect(getPurchasesReport).toHaveBeenLastCalledWith(
        { from: MONTH_FROM, to: TODAY, groupBy: "commodity" },
        expect.anything(),
      ),
    );
    const table = await screen.findByRole("table", {
      name: "Purchases by group",
    });
    expect(within(table).getByText("گندم")).toBeInTheDocument();
    expect(within(table).queryByText("Net")).toBeNull();
    expect(
      screen.getByText(/left out when bills are split/),
    ).toBeInTheDocument();
  });

  it("outstanding: both sides with their totals and khata links", async () => {
    renderPage(<OutstandingReportPage />);
    const receivable = await footer("Traders who owe the shop");
    expect(receivable).toHaveTextContent(
      `Total · 12 traders${formatRs(fullOutstanding.receivable.total)}`,
    );
    const payable = await footer("Traders the shop owes");
    expect(payable).toHaveTextContent(formatRs(fullOutstanding.payable.total));
    expect(
      screen.getByRole("link", { name: "Open Malik Traders’s khata" }),
    ).toHaveAttribute(
      "href",
      `/ledger?trader=${fullOutstanding.receivable.traders[0].traderId}`,
    );
    expect(getOutstanding).toHaveBeenCalledWith({}, expect.anything());
  });

  it("cash book: the payments cash book's cards, and a link to its vouchers", async () => {
    renderPage(<CashBookReportPage />);
    expect(await screen.findByTestId("cash-closing")).toHaveTextContent(
      formatRs(monthCashBook.closingCash),
    );
    expect(
      screen.getByRole("link", { name: "See the cash vouchers" }),
    ).toHaveAttribute("href", `/payments?from=${MONTH_FROM}&to=${TODAY}`);
  });

  it("daily summary: today's figures, and the day can change", async () => {
    const { onUrlUpdate } = renderPage(<DailySummaryReportPage />);
    const cards = within(await screen.findByTestId("report-cards"));
    expect(
      cards.getByText(formatRs(dailySummary.cash.closingCash)),
    ).toBeInTheDocument();
    expect(getDailySummary).toHaveBeenCalledWith(
      { date: TODAY },
      expect.anything(),
    );
    expect(await screen.findByText("گندم")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
        "?date=2026-11-05",
      ),
    );
    expect(screen.getByRole("button", { name: "Next day" })).toBeEnabled();
  });
});
