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
import { cancelSale, getSale, listSales } from "../api";
import { BEOPARI, saleList, savedSale, ticketSale } from "../test-data";
import { EditSalePage } from "./sale-pages";
import { SaleDetailPage } from "./sale-view";
import { SalesPage } from "./sales-page";

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
  listSales: vi.fn(),
  getSale: vi.fn(),
  cancelSale: vi.fn(),
}));
vi.mock("@/features/commodities/api", () => ({ listCommodities: vi.fn() }));

const bill = savedSale(ticketSale);
const cancelled = savedSale(ticketSale, {
  id: "eeeeeeee-8888-4888-8888-888888888888",
  billNo: "SAL-2026-27-000002",
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

const lastQuery = () => vi.mocked(listSales).mock.calls.at(-1)?.[0];

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
    .mockResolvedValue(shopSettings({ displayName: "Al-Madina" }));
  useParchiPrefs.setState({ paper: "a4", lang: null });
});

describe("SalesPage", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(listSales)
      .mockReset()
      .mockResolvedValue(saleList([bill, cancelled]));
    vi.mocked(cancelSale).mockReset();
    vi.mocked(listCommodities).mockResolvedValue(commodityList([]));
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });

  afterEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
  });

  it("lists bills newest first with beopari, amounts and status", async () => {
    renderWith(<SalesPage />, operator);

    const link = await screen.findByRole("link", { name: bill.billNo });
    expect(link).toHaveAttribute("href", `/sales/${bill.id}`);
    const row = link.closest("tr")!;
    expect(row).toHaveTextContent("Shahid Traders");
    expect(row).toHaveTextContent("Rs 100,000.00");
    expect(row).toHaveTextContent("Rs 2,700.00");
    expect(row).toHaveTextContent("Rs 102,700.00");
    expect(row).toHaveTextContent("Saved");
    expect(
      screen.getByRole("link", { name: cancelled.billNo }).closest("tr"),
    ).toHaveTextContent("Cancelled");
    expect(lastQuery()).toEqual({ page: 1, limit: 20, sort: "-saleDate" });
    expect(screen.getByRole("link", { name: "New sale" })).toHaveAttribute(
      "href",
      "/sales/new",
    );
  });

  it("sends the URL filters to the server", async () => {
    renderWith(
      <SalesPage />,
      owner,
      `?from=2026-11-01&to=2026-11-06&status=cancelled&buyer=${BEOPARI.id}&q=SAL`,
    );
    await screen.findByRole("link", { name: bill.billNo });
    expect(lastQuery()).toEqual({
      page: 1,
      limit: 20,
      sort: "-saleDate",
      search: "SAL",
      from: "2026-11-01",
      to: "2026-11-06",
      status: "cancelled",
      buyer: BEOPARI.id,
    });
    expect(screen.getByRole("combobox", { name: "Beopari" })).toHaveTextContent(
      "Shahid Traders",
    );
  });

  it("Reprint prints the sale's parchi from the list, cancelled ones watermarked", async () => {
    vi.mocked(getSale).mockReset().mockResolvedValue(cancelled);
    useParchiPrefs.setState({ paper: "a5", lang: "en" });
    renderWith(<SalesPage />, operator);
    const menu = await openActions(cancelled.billNo);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Reprint" }));

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(getSale).toHaveBeenCalledWith(cancelled.id, expect.anything());
    const outlet = within(screen.getByTestId("reprint-outlet"));
    const parchi = outlet.getByRole("article", {
      name: `Sale parchi ${cancelled.billNo}`,
      hidden: true,
    });
    expect(parchi).toHaveAttribute("data-parchi", "a5");
    expect(outlet.getByTestId("parchi-watermark")).toHaveTextContent(
      "CANCELLED",
    );
    expect(parchi).toHaveTextContent("BeopariShahid Traders");
  });

  it("operators only view", async () => {
    renderWith(<SalesPage />, operator);
    const menu = await openActions(bill.billNo);
    expect(within(menu).getByRole("menuitem", { name: "View" })).toBeVisible();
    expect(within(menu).queryByRole("menuitem", { name: "Edit" })).toBeNull();
    expect(
      within(menu).queryByRole("menuitem", { name: "Cancel sale" }),
    ).toBeNull();
  });

  it("a manager can edit but not cancel", async () => {
    renderWith(<SalesPage />, manager);
    const menu = await openActions(bill.billNo);
    expect(
      within(menu).getByRole("menuitem", { name: "Edit" }),
    ).toHaveAttribute("href", `/sales/${bill.id}/edit`);
    expect(
      within(menu).queryByRole("menuitem", { name: "Cancel sale" }),
    ).toBeNull();
  });

  it("the owner cancels a bill after confirming", async () => {
    vi.mocked(cancelSale).mockResolvedValue({ ...bill, status: "cancelled" });
    renderWith(<SalesPage />, owner);
    const menu = await openActions(bill.billNo);
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Cancel sale" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(`Cancel ${bill.billNo}?`);
    expect(dialog).toHaveTextContent(
      "The beopari’s khata entries are reversed.",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancel sale" }),
    );

    await waitFor(() => expect(cancelSale).toHaveBeenCalledWith(bill.id));
    expect(
      await screen.findByText(`${bill.billNo} cancelled`),
    ).toBeInTheDocument();
  });

  it("shows an already cancelled bill as an error", async () => {
    vi.mocked(cancelSale).mockRejectedValue(
      httpError(undefined, 409, { code: "SALE_CANCELLED" }),
    );
    renderWith(<SalesPage />, owner);
    const menu = await openActions(bill.billNo);
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Cancel sale" }),
    );
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Cancel sale",
      }),
    );
    expect(
      await screen.findByText("This sale was already cancelled."),
    ).toBeInTheDocument();
  });
});

describe("SaleDetailPage", () => {
  beforeEach(() => {
    vi.mocked(getSale).mockReset().mockResolvedValue(bill);
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows the parchi as it prints: items, each charge added and the rounding line", async () => {
    renderWith(<SaleDetailPage id={bill.id} />, operator);

    expect(
      await screen.findByRole("heading", { name: `Bill ${bill.billNo}` }),
    ).toBeVisible();
    const parchi = screen.getByRole("article", {
      name: `Sale parchi ${bill.billNo}`,
    });
    expect(parchi).toHaveAttribute("data-print-area");
    expect(within(parchi).getByTestId("parchi-shop")).toHaveTextContent(
      "Demo Mandi",
    );
    expect(parchi).toHaveTextContent("BeopariShahid Traders");
    expect(parchi).toHaveTextContent("25 mn");
    expect(parchi).toHaveTextContent("Rs 4,000.00per maund");
    const lines = within(screen.getByTestId("parchi-sums"));
    expect(lines.getByText("Total charges").nextSibling).toHaveTextContent(
      "+Rs 2,700.00",
    );
    expect(lines.getByText("Rounding").nextSibling).toHaveTextContent(
      "Rs 0.00",
    );
    expect(screen.getByTestId("parchi-net")).toHaveTextContent("Rs 102,700.00");
    // Operators can't edit, cancel, open the Traders page or read Settings.
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel sale" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Open beopari’s khata" }),
    ).toBeNull();
    expect(getSettings).not.toHaveBeenCalled();
    expect(print).not.toHaveBeenCalled();
  });

  it("?print=1 prints the parchi once; the owner can edit, cancel and open the khata", async () => {
    const { onUrlUpdate } = renderWith(
      <SaleDetailPage id={bill.id} />,
      owner,
      "?print=1",
    );
    await screen.findByRole("article", { name: `Sale parchi ${bill.billNo}` });
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(""),
    );
    expect(screen.getByTestId("parchi-shop")).toHaveTextContent("Al-Madina");
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/sales/${bill.id}/edit`,
    );
    expect(screen.getByRole("button", { name: "Cancel sale" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open beopari’s khata" }),
    ).toHaveAttribute("href", `/traders/${BEOPARI.id}`);
  });

  it("a cancelled sale's parchi is watermarked", async () => {
    vi.mocked(getSale).mockResolvedValue(cancelled);
    renderWith(<SaleDetailPage id={cancelled.id} />, owner);
    await screen.findByRole("article", {
      name: `Sale parchi ${cancelled.billNo}`,
    });
    expect(screen.getByTestId("parchi-watermark")).toHaveTextContent(
      "CANCELLED",
    );
    expect(screen.getByRole("note")).toBeVisible();
  });

  it("shows 404 for an unknown bill", async () => {
    vi.mocked(getSale).mockRejectedValue(httpError(undefined, 404));
    renderWith(<SaleDetailPage id="nope" />, owner);
    expect(
      await screen.findByRole("heading", { name: /not found/i }),
    ).toBeVisible();
  });

  it("a cancelled bill can't be edited", async () => {
    vi.mocked(getSale).mockResolvedValue(cancelled);
    renderWith(<EditSalePage id={cancelled.id} />, owner);
    expect(
      await screen.findByText("This sale is cancelled and can’t be changed."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      `/sales/${cancelled.id}`,
    );
  });
});
