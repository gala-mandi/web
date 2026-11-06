import { testTranslator } from "@/test/intl";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import Link from "next/link";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { listCommodities } from "@/features/commodities/api";
import { commodityList } from "@/features/commodities/test-data";
import { useSessionStore } from "@/stores/session";
import { manager, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { getDayRates, getTodayRates, listAllRates } from "../api";
import {
  dayRates,
  gandum,
  kapas,
  rate,
  TODAY,
  todayRates,
  YESTERDAY,
} from "../test-data";
import { RatesPage } from "./rates-page";

const tr = testTranslator("rates");

vi.mock("../api", () => ({
  getTodayRates: vi.fn(),
  getDayRates: vi.fn(),
  listAllRates: vi.fn(),
  saveRates: vi.fn(),
}));
vi.mock("@/features/commodities/api", () => ({ listCommodities: vi.fn() }));

function renderPage(user: User = manager, searchParams = "") {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        <TestProviders>{children}</TestProviders>
      </NuqsTestingAdapter>
    );
  }
  render(
    <>
      <RatesPage />
      <Link href="/purchases">Purchases</Link>
    </>,
    { wrapper: Wrapper },
  );
  return { onUrlUpdate };
}

const minGandum = () =>
  screen.findByLabelText("Min rate for Gandum") as Promise<HTMLInputElement>;

describe("RatesPage", () => {
  beforeEach(() => {
    vi.mocked(listCommodities)
      .mockReset()
      .mockResolvedValue(commodityList([gandum, kapas]));
    vi.mocked(getTodayRates)
      .mockReset()
      .mockResolvedValue(todayRates([rate()], [rate({ rateDate: YESTERDAY })]));
    vi.mocked(getDayRates)
      .mockReset()
      .mockImplementation(async (date) =>
        dayRates(date, [rate({ rateDate: date, minRate: "3000.00" })]),
      );
    vi.mocked(listAllRates).mockReset().mockResolvedValue([]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    useSessionStore.getState().clear();
  });

  it("operator (rate.view): today's rates, read-only, no date picker", async () => {
    renderPage(operator);
    expect(
      await screen.findByLabelText("Min rate for Gandum"),
    ).toHaveTextContent("Rs 4,000.00");
    expect(
      screen.getByText(tr("date.today", { date: "6 Nov 2026" })),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(tr("date.label"))).toBeNull();
    expect(screen.queryByRole("button", { name: tr("grid.save") })).toBeNull();
    expect(document.querySelectorAll("input[data-rate-cell]")).toHaveLength(0);
  });

  it("operator: a past ?date= is ignored (only owner/manager pick past days)", async () => {
    renderPage(operator, "?date=2026-11-01");
    expect(
      await screen.findByLabelText("Min rate for Gandum"),
    ).toHaveTextContent("Rs 4,000.00");
    expect(getDayRates).not.toHaveBeenCalled();
  });

  it("manager picks a past day: its rates and the day before load, the URL keeps it", async () => {
    const { onUrlUpdate } = renderPage(manager);
    const picker = await screen.findByLabelText(tr("date.label"));
    expect(picker).toHaveAttribute("max", TODAY);
    expect(picker).toHaveValue(TODAY);

    fireEvent.change(picker, { target: { value: "2026-11-01" } });

    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
        "?date=2026-11-01",
      ),
    );
    expect((await minGandum()).value).toBe("3000.00");
    expect(getDayRates).toHaveBeenCalledWith("2026-11-01", expect.anything());
    expect(getDayRates).toHaveBeenCalledWith("2026-10-31", expect.anything());
    expect(screen.getByText(tr("date.pastHint"))).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: tr("date.backToToday") }),
    );
    await waitFor(() =>
      expect(screen.queryByText(tr("date.pastHint"))).toBeNull(),
    );
    expect((await minGandum()).value).toBe("4000.00");
  });

  it("owner can open a past day straight from the URL", async () => {
    renderPage(owner, "?date=2026-11-02");
    expect((await minGandum()).value).toBe("3000.00");
    expect(
      screen.getByText(tr("date.showing", { date: "2 Nov 2026" })),
    ).toBeInTheDocument();
  });

  it("a future ?date= shows today", async () => {
    renderPage(owner, "?date=2026-12-01");
    expect((await minGandum()).value).toBe("4000.00");
    expect(getDayRates).not.toHaveBeenCalled();
  });

  it("unsaved changes: leaving through a link asks first; cancel stays", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage(manager);
    fireEvent.change(await minGandum(), { target: { value: "4100" } });
    await screen.findByText(tr("grid.unsaved"));

    const link = screen.getByRole("link", { name: "Purchases" });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      link.dispatchEvent(click);
    });
    expect(confirm).toHaveBeenCalledWith(tr("grid.leaveWarning"));
    expect(click.defaultPrevented).toBe(true);

    // Reload / close tab: the browser's own prompt.
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    // Another date asks too, and staying keeps the typed rate.
    fireEvent.change(screen.getByLabelText(tr("date.label")), {
      target: { value: "2026-11-01" },
    });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect((await minGandum()).value).toBe("4100");
  });

  it("no warning without changes", async () => {
    const confirm = vi.spyOn(window, "confirm");
    renderPage(manager);
    await minGandum();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      screen.getByRole("link", { name: "Purchases" }).dispatchEvent(click);
    });
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(confirm).not.toHaveBeenCalled();
    expect(unload.defaultPrevented).toBe(false);
  });

  it("no commodities: an empty state with a way to add them", async () => {
    vi.mocked(listCommodities).mockResolvedValue(commodityList([]));
    vi.mocked(getTodayRates).mockResolvedValue(todayRates());
    renderPage(owner);
    expect(await screen.findByText(tr("grid.empty.title"))).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: tr("grid.empty.action") }),
    ).toHaveAttribute("href", "/commodities");
  });

  it("the trend chart asks for the first commodity's last 30 days, oldest first", async () => {
    renderPage(operator);
    expect(await screen.findByText(tr("chart.noData"))).toBeInTheDocument();
    expect(listAllRates).toHaveBeenCalledWith(
      {
        commodity: gandum.id,
        from: "2026-10-08",
        to: TODAY,
        sort: "rateDate",
      },
      expect.anything(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: tr("chart.range", { days: 7 }) }),
    );
    await waitFor(() =>
      expect(listAllRates).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: "2026-10-31", to: TODAY }),
        expect.anything(),
      ),
    );
    expect(
      screen.getByRole("button", { name: tr("chart.range", { days: 7 }) }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("with rates in the period the chart is drawn", async () => {
    vi.mocked(listAllRates).mockResolvedValue([
      rate({ rateDate: "2026-11-01" }),
      rate({ rateDate: "2026-11-04", avgRate: "4100.00" }),
    ]);
    renderPage(operator);
    expect(await screen.findByTestId("rate-trend-chart")).toBeInTheDocument();
    expect(screen.queryByText(tr("chart.noData"))).toBeNull();
  });

  it("a load error offers a retry", async () => {
    vi.mocked(getTodayRates).mockRejectedValue(new Error("down"));
    renderPage(manager);
    expect(await screen.findByText(tr("grid.loadError"))).toBeInTheDocument();
    vi.mocked(getTodayRates).mockResolvedValue(todayRates([rate()]));
    fireEvent.click(screen.getByRole("button", { name: tr("grid.retry") }));
    expect((await minGandum()).value).toBe("4000.00");
  });
});
