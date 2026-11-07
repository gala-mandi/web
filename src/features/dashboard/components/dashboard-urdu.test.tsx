import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listCommodities } from "@/features/commodities/api";
import { listAllRates } from "@/features/rates/api";
import { bidi } from "@/i18n/bidi";
import { useSessionStore } from "@/stores/session";
import { owner } from "@/test/fake-api";
import { setTestLocale } from "@/test/intl";
import { TestProviders } from "@/test/render-panel";
import {
  getDailySummary,
  getOutstanding,
  getPurchasesReport,
  getSalesReport,
} from "../api";
import {
  commodityList,
  dailySummary,
  outstanding,
  purchasesByCommodity,
  purchasesByDay,
  rateHistories,
  salesByDay,
  TODAY,
} from "../test-data";
import type { BookReportQuery, PurchasesReport, SalesReport } from "../types";
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

function mockShop() {
  vi.mocked(getDailySummary).mockResolvedValue(dailySummary);
  vi.mocked(getPurchasesReport).mockImplementation(
    async (query: BookReportQuery) =>
      (query.groupBy === "commodity"
        ? purchasesByCommodity
        : purchasesByDay) as PurchasesReport & SalesReport,
  );
  vi.mocked(getSalesReport).mockResolvedValue(salesByDay as SalesReport);
  vi.mocked(getOutstanding).mockResolvedValue(outstanding);
  vi.mocked(listAllRates).mockImplementation(
    async (query) => rateHistories[query.commodity ?? ""] ?? [],
  );
  vi.mocked(listCommodities).mockResolvedValue({
    data: commodityList,
    meta: { page: 1, limit: 100, total: commodityList.length },
  } as never);
}

async function renderDashboard() {
  useSessionStore.getState().setSession({ accessToken: "t", user: owner });
  const view = render(
    <TestProviders>
      <Dashboard />
    </TestProviders>,
  );
  await waitFor(() => expect(listAllRates).toHaveBeenCalledTimes(3));
  return view;
}

/** What the rate requests asked for, without the abort signal. */
const rateRequests = () =>
  vi.mocked(listAllRates).mock.calls.map(([query]) => query);

describe("Dashboard on the Urdu interface", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${TODAY}T07:00:00Z`));
    vi.clearAllMocks();
    mockShop();
  });
  afterEach(() => {
    vi.useRealTimers();
    useSessionStore.getState().clear();
  });

  it("asks for exactly the same rates in English and Urdu (no Urdu digits or month names in the dates)", async () => {
    const english = await renderDashboard();
    const inEnglish = rateRequests();
    english.unmount();
    vi.mocked(listAllRates).mockClear();

    setTestLocale("ur");
    await renderDashboard();
    expect(rateRequests()).toEqual(inEnglish);
    for (const query of inEnglish) {
      expect(query.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(query.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("shows each commodity's Urdu name first and its rate chart", async () => {
    setTestLocale("ur");
    await renderDashboard();
    const rates = await screen.findByTestId("commodity-rates");
    await waitFor(() => expect(rates).toHaveTextContent("گندم"));
    expect(rates).toHaveTextContent("چاول (باسمتی)");
    expect(rates.querySelectorAll("[role=img]").length).toBeGreaterThan(0);
  });

  it("keeps a name that ends in punctuation in one piece (Al-Madina Rice Co.)", async () => {
    setTestLocale("ur");
    await renderDashboard();
    const name = await screen.findByText("Al-Madina Rice Co.");
    expect(name.tagName).toBe("BDI");
    expect(name).toHaveAttribute("dir", "auto");
  });
});

describe("bidi", () => {
  it("isolates a value that would reorder its neighbours", () => {
    expect(bidi("Al-Madina Rice Co.")).toBe("⁨Al-Madina Rice Co.⁩");
    expect(bidi("(Basmati)")).toBe("⁨(Basmati)⁩");
    expect(bidi("محمد اسلم")).toBe("⁨محمد اسلم⁩");
  });

  it("leaves a plain one-script name alone", () => {
    expect(bidi("Rafiq Ahmad")).toBe("Rafiq Ahmad");
    expect(bidi("")).toBe("");
  });
});
