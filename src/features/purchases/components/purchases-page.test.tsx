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
import { commodityList } from "@/features/commodities/test-data";
import { useSessionStore } from "@/stores/session";
import { httpError, manager, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { cancelPurchase, getPurchase, listPurchases } from "../api";
import { purchaseList, savedPurchase, ticketInput } from "../test-data";
import { PurchasesPage } from "./purchases-page";
import { PurchaseDetailPage } from "./purchase-view";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock("../api", () => ({
  listPurchases: vi.fn(),
  getPurchase: vi.fn(),
  cancelPurchase: vi.fn(),
}));
vi.mock("@/features/commodities/api", () => ({ listCommodities: vi.fn() }));

const bill = savedPurchase(ticketInput);
const cancelled = savedPurchase(ticketInput, {
  id: "88888888-8888-4888-8888-888888888888",
  billNo: "PUR-2026-27-000002",
  status: "cancelled",
});

function renderWith(node: ReactNode, user: User, searchParams = "") {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  render(
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={onUrlUpdate}
      hasMemory
    >
      <TestProviders>{node}</TestProviders>
    </NuqsTestingAdapter>,
  );
  return { onUrlUpdate };
}

const lastQuery = () => vi.mocked(listPurchases).mock.calls.at(-1)?.[0];

async function openActions(billNo: string) {
  const trigger = await screen.findByRole("button", {
    name: `Actions for ${billNo}`,
  });
  fireEvent.keyDown(trigger, { key: "Enter" });
  return screen.findByRole("menu");
}

describe("PurchasesPage", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(listPurchases)
      .mockReset()
      .mockResolvedValue(purchaseList([bill, cancelled]));
    vi.mocked(cancelPurchase).mockReset();
    vi.mocked(listCommodities).mockResolvedValue(commodityList([]));
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });

  afterEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
  });

  it("lists bills newest first with kissan, amounts and status", async () => {
    renderWith(<PurchasesPage />, operator);

    const link = await screen.findByRole("link", { name: bill.billNo });
    expect(link).toHaveAttribute("href", `/purchases/${bill.id}`);
    const row = link.closest("tr")!;
    expect(row).toHaveTextContent("Rafiq Ahmad");
    expect(row).toHaveTextContent("Rs 100,000.00");
    expect(row).toHaveTextContent("Rs 2,700.00");
    expect(row).toHaveTextContent("Rs 97,300.00");
    expect(row).toHaveTextContent("Saved");
    expect(
      screen.getByRole("link", { name: cancelled.billNo }).closest("tr"),
    ).toHaveTextContent("Cancelled");
    expect(lastQuery()).toEqual({ page: 1, limit: 20, sort: "-purchaseDate" });
    expect(screen.getByRole("link", { name: "New purchase" })).toHaveAttribute(
      "href",
      "/purchases/new",
    );
  });

  it("sends the URL filters to the server", async () => {
    renderWith(
      <PurchasesPage />,
      owner,
      "?from=2026-11-01&to=2026-11-06&status=cancelled&trader=44444444-4444-4444-8444-444444444444&q=PUR",
    );
    await screen.findByRole("link", { name: bill.billNo });
    expect(lastQuery()).toEqual({
      page: 1,
      limit: 20,
      sort: "-purchaseDate",
      search: "PUR",
      from: "2026-11-01",
      to: "2026-11-06",
      status: "cancelled",
      trader: "44444444-4444-4444-8444-444444444444",
    });
    // The kissan filter shows the name from the rows after a reload.
    expect(screen.getByRole("combobox", { name: "Kissan" })).toHaveTextContent(
      "Rafiq Ahmad",
    );
  });

  it("operators only view; managers edit; only the owner cancels", async () => {
    renderWith(<PurchasesPage />, operator);
    const menu = await openActions(bill.billNo);
    expect(within(menu).getByRole("menuitem", { name: "View" })).toBeVisible();
    expect(within(menu).queryByRole("menuitem", { name: "Edit" })).toBeNull();
    expect(
      within(menu).queryByRole("menuitem", { name: "Cancel purchase" }),
    ).toBeNull();
  });

  it("a manager can edit but not cancel", async () => {
    renderWith(<PurchasesPage />, manager);
    const menu = await openActions(bill.billNo);
    expect(
      within(menu).getByRole("menuitem", { name: "Edit" }),
    ).toHaveAttribute("href", `/purchases/${bill.id}/edit`);
    expect(
      within(menu).queryByRole("menuitem", { name: "Cancel purchase" }),
    ).toBeNull();
  });

  it("the owner cancels a bill after confirming", async () => {
    vi.mocked(cancelPurchase).mockResolvedValue({
      ...bill,
      status: "cancelled",
    });
    renderWith(<PurchasesPage />, owner);
    const menu = await openActions(bill.billNo);
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Cancel purchase" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(`Cancel ${bill.billNo}?`);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancel purchase" }),
    );

    await waitFor(() => expect(cancelPurchase).toHaveBeenCalledWith(bill.id));
    expect(
      await screen.findByText(`${bill.billNo} cancelled`),
    ).toBeInTheDocument();
    // The cancelled bill no longer offers edit or cancel.
    expect(
      screen.queryByRole("menuitem", { name: "Cancel purchase" }),
    ).toBeNull();
  });

  it("shows an already cancelled bill as an error", async () => {
    vi.mocked(cancelPurchase).mockRejectedValue(
      httpError(undefined, 409, { code: "PURCHASE_CANCELLED" }),
    );
    renderWith(<PurchasesPage />, owner);
    const menu = await openActions(bill.billNo);
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Cancel purchase" }),
    );
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Cancel purchase",
      }),
    );
    expect(
      await screen.findByText("This purchase was already cancelled."),
    ).toBeInTheDocument();
  });
});

describe("PurchaseDetailPage", () => {
  beforeEach(() => {
    vi.mocked(getPurchase).mockReset().mockResolvedValue(bill);
    window.print = vi.fn();
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows the bill with items, each deduction and the rounding line", async () => {
    renderWith(<PurchaseDetailPage id={bill.id} />, operator);

    expect(
      await screen.findByRole("heading", { name: `Bill ${bill.billNo}` }),
    ).toBeVisible();
    const printed = screen.getByRole("article");
    expect(printed).toHaveAttribute("data-print-area");
    expect(printed).toHaveTextContent("Demo Mandi");
    expect(printed).toHaveTextContent("Rafiq Ahmad");
    expect(printed).toHaveTextContent("25 mn");
    expect(printed).toHaveTextContent("1,000 kg");
    expect(printed).toHaveTextContent("Rs 4,000.00 per maund");
    const lines = within(screen.getByTestId("purchase-breakdown"));
    expect(lines.getByText("Rounding").nextSibling).toHaveTextContent(
      "Rs 0.00",
    );
    expect(screen.getByTestId("purchase-net")).toHaveTextContent(
      "Rs 97,300.00",
    );
    // Operators can't edit or cancel.
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Cancel purchase" }),
    ).toBeNull();
    expect(window.print).not.toHaveBeenCalled();
  });

  it("?print=1 opens the print dialog once", async () => {
    const { onUrlUpdate } = renderWith(
      <PurchaseDetailPage id={bill.id} />,
      owner,
      "?print=1",
    );
    await screen.findByRole("article");
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(""),
    );
    expect(screen.getByRole("link", { name: "Edit" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cancel purchase" }),
    ).toBeVisible();
  });

  it("shows 404 for an unknown bill", async () => {
    vi.mocked(getPurchase).mockRejectedValue(httpError(undefined, 404));
    renderWith(<PurchaseDetailPage id="nope" />, owner);
    expect(
      await screen.findByRole("heading", { name: /not found/i }),
    ).toBeVisible();
  });
});
