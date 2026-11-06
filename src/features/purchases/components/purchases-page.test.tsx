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
import { getMe } from "@/features/auth/api";
import { getSettings } from "@/features/settings/api";
import { shopSettings } from "@/features/settings/test-data";
import { useParchiPrefs } from "@/stores/parchi";
import { useSessionStore } from "@/stores/session";
import { httpError, manager, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { cancelPurchase, getPurchase, listPurchases } from "../api";
import { purchaseList, savedPurchase, ticketInput } from "../test-data";
import { PurchasesPage } from "./purchases-page";
import { PurchaseDetailPage } from "./purchase-view";

const push = vi.hoisted(() => vi.fn());
const print = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock("react-to-print", () => ({ useReactToPrint: () => print }));
vi.mock("@/features/auth/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/api")>()),
  getMe: vi.fn(),
}));
vi.mock("@/features/settings/api", () => ({ getSettings: vi.fn() }));
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

beforeEach(() => {
  print.mockReset();
  vi.mocked(getMe).mockImplementation(
    async () => useSessionStore.getState().user!,
  );
  vi.mocked(getSettings)
    .mockReset()
    .mockResolvedValue(
      shopSettings({ displayName: "Al-Madina", parchiFooter: "Shukriya" }),
    );
  useParchiPrefs.setState({ paper: "a4", lang: null });
});

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

  it("Reprint loads the whole bill and prints its parchi without leaving the list", async () => {
    vi.mocked(getPurchase).mockReset().mockResolvedValue(bill);
    useParchiPrefs.setState({ paper: "thermal80", lang: "ur" });
    renderWith(<PurchasesPage />, operator);
    const menu = await openActions(bill.billNo);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Reprint" }));

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(getPurchase).toHaveBeenCalledWith(bill.id, expect.anything());
    // The remembered paper and language; off screen, not in the list.
    const parchi = screen.getByTestId("reprint-outlet").firstElementChild!;
    expect(parchi).toHaveAttribute("data-parchi", "thermal80");
    expect(parchi).toHaveAttribute("dir", "rtl");
    expect(parchi).toHaveTextContent(bill.billNo);
    expect(screen.getByTestId("reprint-outlet")).toHaveClass("hidden");
    expect(push).not.toHaveBeenCalled();
  });

  it("a cancelled bill reprints with the CANCELLED watermark", async () => {
    vi.mocked(getPurchase).mockReset().mockResolvedValue(cancelled);
    renderWith(<PurchasesPage />, owner);
    const menu = await openActions(cancelled.billNo);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Reprint" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const outlet = within(screen.getByTestId("reprint-outlet"));
    expect(outlet.getByTestId("parchi-watermark")).toHaveTextContent(
      "CANCELLED",
    );
    // The owner's parchi has the Settings header.
    expect(outlet.getByTestId("parchi-shop")).toHaveTextContent("Al-Madina");
  });

  it("a failed Reprint says so and prints nothing", async () => {
    vi.mocked(getPurchase)
      .mockReset()
      .mockRejectedValue(httpError(undefined, 500));
    renderWith(<PurchasesPage />, operator);
    const menu = await openActions(bill.billNo);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Reprint" }));
    expect(
      await screen.findByText("Couldn’t print the parchi. Please try again."),
    ).toBeInTheDocument();
    expect(print).not.toHaveBeenCalled();
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
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows the parchi as it prints: items, each deduction and the rounding line", async () => {
    renderWith(<PurchaseDetailPage id={bill.id} />, operator);

    expect(
      await screen.findByRole("heading", { name: `Bill ${bill.billNo}` }),
    ).toBeVisible();
    const parchi = screen.getByRole("article", {
      name: `Purchase parchi ${bill.billNo}`,
    });
    expect(parchi).toHaveAttribute("data-print-area");
    expect(parchi).toHaveAttribute("data-parchi", "a4");
    // Operators can't read Settings: the shop name from their session.
    expect(getSettings).not.toHaveBeenCalled();
    expect(within(parchi).getByTestId("parchi-shop")).toHaveTextContent(
      "Demo Mandi",
    );
    expect(parchi).toHaveTextContent("KissanRafiq Ahmad");
    expect(parchi).toHaveTextContent("25 mn");
    expect(parchi).toHaveTextContent("1,000 kg");
    expect(parchi).toHaveTextContent("Rs 4,000.00per maund");
    const lines = within(screen.getByTestId("parchi-sums"));
    expect(lines.getByText("Rounding").nextSibling).toHaveTextContent(
      "Rs 0.00",
    );
    expect(screen.getByTestId("parchi-net")).toHaveTextContent("Rs 97,300.00");
    // Operators can't edit or cancel.
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Cancel purchase" }),
    ).toBeNull();
    expect(print).not.toHaveBeenCalled();
  });

  it("the owner's parchi carries the Settings header and footer", async () => {
    renderWith(<PurchaseDetailPage id={bill.id} />, owner);
    const parchi = await screen.findByRole("article", {
      name: `Purchase parchi ${bill.billNo}`,
    });
    await waitFor(() =>
      expect(within(parchi).getByTestId("parchi-shop")).toHaveTextContent(
        "Al-Madina",
      ),
    );
    expect(parchi).toHaveTextContent("Shop 12, Grain Market, Okara");
    expect(within(parchi).getByTestId("parchi-footer")).toHaveTextContent(
      "Shukriya",
    );
  });

  it("picks the paper and language; Print parchi prints that", async () => {
    renderWith(<PurchaseDetailPage id={bill.id} />, owner);
    await screen.findByRole("article", {
      name: `Purchase parchi ${bill.billNo}`,
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Paper" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "80 mm thermal" }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Parchi language" }));
    fireEvent.click(await screen.findByRole("option", { name: "اردو" }));

    const parchi = screen.getByRole("article", {
      name: `خرید کی پرچی ${bill.billNo}`,
    });
    expect(parchi).toHaveAttribute("data-parchi", "thermal80");
    expect(parchi).toHaveAttribute("dir", "rtl");
    // Remembered for Save & Print and Reprint.
    expect(useParchiPrefs.getState()).toMatchObject({
      paper: "thermal80",
      lang: "ur",
    });

    fireEvent.click(screen.getByRole("button", { name: "Print parchi" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });

  it("the shop's Urdu setting is the default language until one is picked", async () => {
    vi.mocked(getSettings).mockResolvedValue(shopSettings({ language: "ur" }));
    renderWith(<PurchaseDetailPage id={bill.id} />, owner);
    expect(
      await screen.findByRole("article", {
        name: `خرید کی پرچی ${bill.billNo}`,
      }),
    ).toHaveAttribute("lang", "ur");
  });

  it("?print=1 prints the parchi once, after the shop header has loaded", async () => {
    const { onUrlUpdate } = renderWith(
      <PurchaseDetailPage id={bill.id} />,
      owner,
      "?print=1",
    );
    await screen.findByRole("article", {
      name: `Purchase parchi ${bill.billNo}`,
    });
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(getSettings).toHaveBeenCalled();
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(""),
    );
    expect(screen.getByRole("link", { name: "Edit" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cancel purchase" }),
    ).toBeVisible();
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("shows 404 for an unknown bill", async () => {
    vi.mocked(getPurchase).mockRejectedValue(httpError(undefined, 404));
    renderWith(<PurchaseDetailPage id="nope" />, owner);
    expect(
      await screen.findByRole("heading", { name: /not found/i }),
    ).toBeVisible();
  });
});
