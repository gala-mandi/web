import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { listCommodities } from "@/features/commodities/api";
import { getTodayRates, listAllRates } from "@/features/rates/api";
import { formatRs } from "@/lib/format";
import { useSessionStore } from "@/stores/session";
import { manager, operator, owner } from "@/test/fake-api";
import { rolePermissions } from "@/test/permissions";
import { TestProviders } from "@/test/render-panel";
import {
  countDayBills,
  getDailySummary,
  getOutstanding,
  getPurchasesReport,
  getSalesReport,
} from "../api";
import { DASHBOARD_REFRESH_MS } from "../hooks";
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
} from "../test-data";
import type { BookReportQuery } from "../types";
import { Dashboard } from "./dashboard";

vi.mock("../api", () => ({
  getDailySummary: vi.fn(),
  getPurchasesReport: vi.fn(),
  getSalesReport: vi.fn(),
  getOutstanding: vi.fn(),
  countDayBills: vi.fn(),
}));
vi.mock("@/features/rates/api", () => ({
  listAllRates: vi.fn(),
  getTodayRates: vi.fn(),
}));
vi.mock("@/features/commodities/api", () => ({ listCommodities: vi.fn() }));

const byGroup =
  (day: typeof purchasesByDay, commodity: typeof purchasesByDay) =>
  async (query: BookReportQuery) =>
    query.groupBy === "commodity" ? commodity : day;

function mockShop() {
  vi.mocked(getDailySummary).mockResolvedValue(dailySummary);
  vi.mocked(getPurchasesReport).mockImplementation(
    byGroup(purchasesByDay, purchasesByCommodity),
  );
  vi.mocked(getSalesReport).mockImplementation(
    byGroup(salesByDay, emptyShop.byCommodity),
  );
  vi.mocked(getOutstanding).mockResolvedValue(outstanding);
  vi.mocked(listAllRates).mockImplementation(
    async (query) => rateHistories[query.commodity ?? ""] ?? [],
  );
}

function mockEmptyShop() {
  vi.mocked(getDailySummary).mockResolvedValue(emptyShop.summary);
  vi.mocked(getPurchasesReport).mockImplementation(
    byGroup(emptyShop.book, emptyShop.byCommodity),
  );
  vi.mocked(getSalesReport).mockImplementation(
    byGroup(emptyShop.book, emptyShop.byCommodity),
  );
  vi.mocked(getOutstanding).mockResolvedValue(emptyShop.outstanding);
}

function renderAs(user: User) {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  return render(
    <TestProviders>
      <Dashboard />
    </TestProviders>,
  );
}

const tile = (id: string) =>
  document.querySelector(`[data-tile="${id}"]`) as HTMLElement;

describe("Dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${TODAY}T07:00:00Z`));
    vi.mocked(getDailySummary).mockReset();
    vi.mocked(getPurchasesReport).mockReset();
    vi.mocked(getSalesReport).mockReset();
    vi.mocked(getOutstanding).mockReset();
    vi.mocked(countDayBills).mockReset();
    vi.mocked(listAllRates).mockReset();
    vi.mocked(getTodayRates).mockReset();
    vi.mocked(listCommodities).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    useSessionStore.getState().clear();
  });

  describe("owner and manager", () => {
    it("shows today's KPIs from the daily summary report", async () => {
      mockShop();
      renderAs(owner);

      expect(
        await within(tile("purchases")).findByText(
          formatRs(dailySummary.purchases.netAmount),
        ),
      ).toBeInTheDocument();
      expect(tile("sales")).toHaveTextContent(
        formatRs(dailySummary.sales.netAmount),
      );
      expect(tile("commission")).toHaveTextContent("Rs 28,865.50");
      expect(tile("cash")).toHaveTextContent("Rs 297,900.00");
      expect(
        screen.getByRole("heading", { level: 1, name: "Dashboard" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Today, 6 Nov 2026")).toBeInTheDocument();
    });

    it("asks for the last 30 days by day, the top 10 balances and the top commodities' rates", async () => {
      mockShop();
      renderAs(manager);

      await screen.findByText("Haji Bashir Ahmad");
      const range = { from: FROM, to: TODAY };
      expect(getPurchasesReport).toHaveBeenCalledWith(
        { ...range, groupBy: "day" },
        expect.anything(),
      );
      expect(getSalesReport).toHaveBeenCalledWith(
        { ...range, groupBy: "day" },
        expect.anything(),
      );
      expect(getPurchasesReport).toHaveBeenCalledWith(
        { ...range, groupBy: "commodity" },
        expect.anything(),
      );
      expect(getOutstanding).toHaveBeenCalledWith(10, expect.anything());
      // Purchases ranked the commodities, so sales are not asked.
      expect(getSalesReport).not.toHaveBeenCalledWith(
        expect.objectContaining({ groupBy: "commodity" }),
        expect.anything(),
      );
      const rates = within(await screen.findByTestId("commodity-rates"));
      expect(
        (await rates.findAllByRole("listitem")).map(
          (li) => li.querySelector("p")?.textContent,
        ),
      ).toEqual(["Gandum", "Chawal (Basmati)", "Makai"]);
      expect(vi.mocked(listAllRates).mock.calls.map(([q]) => q)).toEqual(
        expect.arrayContaining([
          {
            commodity: "22222222-2222-4222-8222-222222222222",
            ...range,
            sort: "rateDate",
          },
        ]),
      );
    });

    it("shows the 30-day totals of the reports next to the chart", async () => {
      mockShop();
      renderAs(owner);

      const trend = within(await screen.findByTestId("sales-trend"));
      const purchases = await trend.findByText(
        formatRs(purchasesByDay.totals.netAmount),
      );
      expect(purchases.closest("[data-legend]")).toHaveAttribute(
        "data-legend",
        "purchases",
      );
      expect(
        trend.getByText(formatRs(salesByDay.totals.netAmount)),
      ).toBeInTheDocument();
    });

    it("lists the top receivables and payables with the full totals", async () => {
      mockShop();
      renderAs(owner);

      const receivable = within(
        await screen.findByTestId("outstanding-receivable"),
      );
      expect(
        await receivable.findByText(formatRs(outstanding.receivable.total)),
      ).toBeInTheDocument();
      expect(receivable.getByText("Top 10 of 24 traders")).toBeInTheDocument();
      const rows = receivable.getAllByRole("listitem");
      expect(rows).toHaveLength(10);
      expect(rows[0]).toHaveTextContent("Malik Traders");
      expect(rows[0]).toHaveTextContent("Beopari");
      expect(rows[0]).toHaveTextContent("Rs 1,245,000.00");
      expect(
        receivable.getByRole("link", { name: "Open Malik Traders’s khata" }),
      ).toHaveAttribute(
        "href",
        `/ledger?trader=${outstanding.receivable.traders[0].traderId}`,
      );

      const payable = within(screen.getByTestId("outstanding-payable"));
      expect(payable.getByText("Rs 3,912,480.00")).toBeInTheDocument();
      expect(payable.getByText("Top 10 of 13 traders")).toBeInTheDocument();
    });

    it("refreshes by itself every few minutes", async () => {
      mockShop();
      renderAs(owner);
      await within(tile("cash")).findByText("Rs 297,900.00");

      expect(DASHBOARD_REFRESH_MS).toBeGreaterThanOrEqual(2 * 60_000);
      expect(DASHBOARD_REFRESH_MS).toBeLessThanOrEqual(5 * 60_000);
      expect(screen.getByTestId("refresh-status")).toHaveTextContent(
        "Refreshes every 3 minutes",
      );
    });

    it("helps a new shop with no data get started", async () => {
      mockEmptyShop();
      renderAs(owner);

      const empty = await screen.findByTestId("dashboard-empty");
      expect(
        within(empty).getByRole("heading", { name: "Your dashboard is ready" }),
      ).toBeInTheDocument();
      expect(
        within(empty)
          .getAllByRole("link")
          .map((a) => [a.textContent, a.getAttribute("href")]),
      ).toEqual([
        ["Set today’s rates", "/rates"],
        ["Add your first purchase", "/purchases/new"],
        ["Add your first sale", "/sales/new"],
      ]);
      expect(document.querySelector("[data-tile]")).toBeNull();
    });

    it("shows a section's own empty state when only that part has no data", async () => {
      mockShop();
      vi.mocked(getOutstanding).mockResolvedValue({
        ...outstanding,
        payable: { total: "0.00", count: 0, traders: [] },
      });
      vi.mocked(getPurchasesReport).mockImplementation(
        byGroup(emptyShop.book, emptyShop.byCommodity),
      );
      vi.mocked(getSalesReport).mockImplementation(
        byGroup(emptyShop.book, emptyShop.byCommodity),
      );
      renderAs(owner);

      expect(
        await screen.findByText("No purchases or sales in the last 30 days."),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(
          "Rates show here once your shop has bills in the last 30 days.",
        ),
      ).toBeInTheDocument();
      expect(await screen.findByText("You owe no one.")).toBeInTheDocument();
      expect(screen.queryByTestId("dashboard-empty")).toBeNull();
    });

    it("ranks the top commodities by sales when nothing was bought", async () => {
      mockShop();
      vi.mocked(getPurchasesReport).mockImplementation(
        byGroup(purchasesByDay, emptyShop.byCommodity),
      );
      vi.mocked(getSalesReport).mockImplementation(
        byGroup(salesByDay, purchasesByCommodity),
      );
      renderAs(owner);

      const rates = within(await screen.findByTestId("commodity-rates"));
      expect(await rates.findByText("Gandum")).toBeInTheDocument();
      expect(getSalesReport).toHaveBeenCalledWith(
        expect.objectContaining({ groupBy: "commodity" }),
        expect.anything(),
      );
    });

    it("offers a retry on a section that fails", async () => {
      mockShop();
      vi.mocked(getOutstanding).mockRejectedValue(new Error("offline"));
      renderAs(owner);

      const alerts = await screen.findAllByText(
        "Couldn’t load the balances. Check your internet and try again.",
      );
      expect(alerts).toHaveLength(2);
      expect(tile("cash")).toBeInTheDocument();
    });
  });

  describe("operator", () => {
    beforeEach(() => {
      vi.mocked(listCommodities).mockResolvedValue({
        data: commodityList as never,
        meta: { total: commodityList.length, page: 1, limit: 100 },
      });
    });

    it("gets the simpler dashboard: today's bill counts and rates, no money totals", async () => {
      vi.mocked(countDayBills).mockResolvedValue({ purchases: 12, sales: 9 });
      vi.mocked(getTodayRates).mockResolvedValue({
        date: TODAY,
        data: dailySummary.rates,
        yesterday: { date: "2026-11-05", data: [] },
      });
      renderAs(operator);

      expect(
        await within(tile("purchases-today")).findByText("12"),
      ).toBeInTheDocument();
      expect(within(tile("sales-today")).getByText("9")).toBeInTheDocument();
      expect(countDayBills).toHaveBeenCalledWith(TODAY, expect.anything());

      const rates = within(screen.getByTestId("today-rates"));
      expect(await rates.findByText("Gandum")).toBeInTheDocument();
      expect(rates.getAllByRole("listitem")).toHaveLength(3);

      // Every /reports route is 403 for operators: none is called.
      expect(getDailySummary).not.toHaveBeenCalled();
      expect(getPurchasesReport).not.toHaveBeenCalled();
      expect(getSalesReport).not.toHaveBeenCalled();
      expect(getOutstanding).not.toHaveBeenCalled();
      expect(document.querySelector('[data-tile="cash"]')).toBeNull();
      expect(screen.queryByText(/Cash in hand|Commission/)).toBeNull();
      expect(tile("purchases-today").querySelector("[data-amount]")).toBeNull();
      expect(screen.queryByText("Top receivables")).toBeNull();
    });

    it("shows rates as min – max per unit, with the average", async () => {
      vi.mocked(countDayBills).mockResolvedValue({ purchases: 1, sales: 0 });
      const rate = dailySummary.rates[0];
      vi.mocked(getTodayRates).mockResolvedValue({
        date: TODAY,
        data: [{ ...rate, rateUnit: "kg", avgRate: null }],
        yesterday: { date: "2026-11-05", data: [] },
      });
      renderAs(operator);

      const item = (
        await within(await screen.findByTestId("today-rates")).findAllByRole(
          "listitem",
        )
      )[0];
      expect(item).toHaveTextContent(
        `${formatRs(rate.minRate)} – ${formatRs(rate.maxRate)}`,
      );
      expect(item).toHaveTextContent("/ kg");
      expect(item).toHaveTextContent("Avg —");
    });

    it("helps an operator of an empty shop start", async () => {
      vi.mocked(countDayBills).mockResolvedValue({ purchases: 0, sales: 0 });
      vi.mocked(getTodayRates).mockResolvedValue({
        date: TODAY,
        data: [],
        yesterday: { date: "2026-11-05", data: [] },
      });
      renderAs(operator);

      const empty = await screen.findByTestId("dashboard-empty");
      expect(empty).toHaveTextContent("Nothing entered today yet");
      expect(
        within(empty)
          .getAllByRole("link")
          .map((a) => a.textContent),
      ).toEqual(["New purchase", "New sale", "See today’s rates"]);
    });

    it("shows an empty rates card when bills exist but no rate is saved", async () => {
      vi.mocked(countDayBills).mockResolvedValue({ purchases: 3, sales: 0 });
      vi.mocked(getTodayRates).mockResolvedValue({
        date: TODAY,
        data: [],
        yesterday: { date: "2026-11-05", data: [] },
      });
      renderAs(operator);

      expect(
        await screen.findByText("No rates saved for today yet."),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("dashboard-empty")).toBeNull();
    });
  });

  it("is 403 for a user without dashboard.view", () => {
    renderAs({
      ...owner,
      role: "super_admin",
      permissions: [...rolePermissions.super_admin],
    });

    expect(screen.getByText("403")).toBeInTheDocument();
    expect(getDailySummary).not.toHaveBeenCalled();
    expect(countDayBills).not.toHaveBeenCalled();
  });
});
