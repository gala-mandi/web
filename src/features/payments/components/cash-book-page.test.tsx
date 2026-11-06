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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { useSessionStore } from "@/stores/session";
import { httpError, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { getCashBook, listPayments } from "../api";
import { savedPayment, TODAY, todayCashBook } from "../test-data";
import { CashBookPage } from "./cash-book-page";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock("../api", () => ({ getCashBook: vi.fn(), listPayments: vi.fn() }));

function renderPage(user: User = owner, searchParams = "") {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  render(
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={onUrlUpdate}
      hasMemory
    >
      <TestProviders>
        <CashBookPage />
      </TestProviders>
    </NuqsTestingAdapter>,
  );
  return { onUrlUpdate };
}

const payment = savedPayment();
const receipt = savedPayment({
  id: "dddddddd-8888-4888-8888-888888888882",
  voucherNo: "RCT-2026-27-000001",
  direction: "received",
  trader: { id: "b1", name: "Shahid Traders" },
  amount: "80000.00",
  allocations: [],
});

describe("CashBookPage", () => {
  beforeEach(() => {
    // 10:30 am on 6 Nov 2026 in Karachi; only Date is faked.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-06T05:30:00.000Z"));
    push.mockReset();
    vi.mocked(getCashBook).mockResolvedValue(todayCashBook);
    vi.mocked(listPayments).mockResolvedValue({
      data: [receipt, payment],
      meta: { page: 1, limit: 50, total: 2 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    useSessionStore.getState().clear();
  });

  it("today: opening, cash in, cash out and cash in hand from the server, and today's cash vouchers", async () => {
    renderPage();
    expect(await screen.findByTestId("cash-closing")).toHaveTextContent(
      "Rs 30,000.00",
    );
    expect(getCashBook).toHaveBeenCalledWith(
      { from: TODAY, to: TODAY },
      expect.anything(),
    );
    expect(listPayments).toHaveBeenCalledWith(
      {
        page: 1,
        limit: 50,
        sort: "paymentDate",
        from: TODAY,
        to: TODAY,
        method: "cash",
        status: "posted",
      },
      expect.anything(),
    );
    expect(screen.getByTestId("cash-opening")).toHaveTextContent(
      "Rs 50,000.00",
    );
    expect(screen.getByTestId("cash-in")).toHaveTextContent("Rs 80,000.00");
    expect(screen.getByTestId("cash-out")).toHaveTextContent("Rs 100,000.00");

    const days = within(screen.getByTestId("cash-book-days"));
    expect(days.getAllByRole("row")[1]).toHaveTextContent(
      "6 Nov 2026Rs 50,000.00Rs 80,000.00Rs 100,000.00Rs 30,000.00",
    );

    const table = within(
      await screen.findByRole("table", { name: "Cash vouchers" }),
    );
    const rct = table.getByRole("row", { name: /RCT-2026-27-000001/ });
    expect(rct).toHaveTextContent("ReceiptShahid TradersRs 80,000.00—");
    const pay = table.getByRole("row", { name: /PAY-2026-27-000001/ });
    expect(pay).toHaveTextContent("PaymentRafiq Ahmad—Rs 100,000.00");

    expect(screen.getByRole("button", { name: "Next day" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Pay kissan" })).toHaveAttribute(
      "href",
      "/payments/new?direction=paid",
    );
  });

  it("steps to the previous day", async () => {
    const { onUrlUpdate } = renderPage();
    await screen.findByTestId("cash-closing");
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
        "?from=2026-11-05&to=2026-11-05",
      ),
    );
    await waitFor(() =>
      expect(getCashBook).toHaveBeenLastCalledWith(
        { from: "2026-11-05", to: "2026-11-05" },
        expect.anything(),
      ),
    );
  });

  it("operators see the cash book and can add vouchers", async () => {
    renderPage(operator);
    expect(await screen.findByTestId("cash-closing")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Receive from beopari" }),
    ).toBeInTheDocument();
  });

  it("shows the 403 page when the server refuses", async () => {
    vi.mocked(getCashBook).mockRejectedValue(httpError(undefined, 403));
    renderPage();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "You don’t have access",
      }),
    ).toBeInTheDocument();
  });
});
