import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { lookupCommodities } from "@/features/commodities/api";
import { getTodayRates } from "@/features/rates/api";
import { rate, todayRates } from "@/features/rates/test-data";
import { getTrader, lookupTraders } from "@/features/traders/api";
import { useSessionStore } from "@/stores/session";
import { httpError, manager, operator } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { createSale, updateSale } from "../api";
import {
  BEOPARI,
  beopariDetail,
  chanaItem,
  gandumItem,
  savedSale,
  ticketSale,
  TODAY,
} from "../test-data";
import type { CreateSaleInput } from "../types";
import { SaleForm } from "./sale-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../api", () => ({ createSale: vi.fn(), updateSale: vi.fn() }));
vi.mock("@/features/rates/api", () => ({ getTodayRates: vi.fn() }));
vi.mock("@/features/commodities/api", () => ({ lookupCommodities: vi.fn() }));
vi.mock("@/features/traders/api", () => ({
  lookupTraders: vi.fn(),
  getTrader: vi.fn(),
}));

function renderForm(
  props: Partial<Parameters<typeof SaleForm>[0]> = {},
  user: User = operator,
) {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  return render(
    <TestProviders>
      <SaleForm today={TODAY} {...props} />
    </TestProviders>,
  );
}

const item = (n: number, label: string) =>
  screen.getByLabelText(new RegExp(`^${label}, Item ${n}$`));

/** The picker's popover is gone and focus is back on its button. */
async function closed() {
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function pickBuyer() {
  fireEvent.click(screen.getByRole("combobox", { name: /^Beopari/ }));
  fireEvent.click(
    await screen.findByRole("option", { name: /Shahid Traders/ }),
  );
  await closed();
}

async function pickCommodity(n: number, name: string) {
  fireEvent.click(
    screen.getByRole("combobox", {
      name: new RegExp(`^Commodity, Item ${n}$`),
    }),
  );
  fireEvent.click(
    await screen.findByRole("option", { name: new RegExp(name) }),
  );
  await closed();
}

function type(n: number, label: string, value: string) {
  fireEvent.change(item(n, label), { target: { value } });
}

/** Beopari, then 10 bags and 25 maund of Gandum at today's Rs 4,000. */
async function fillTicketSale() {
  await pickBuyer();
  await pickCommodity(1, "Gandum");
  await waitFor(() => expect(item(1, "Rate")).toHaveValue("4000"));
  type(1, "Bags", "10");
  type(1, "Weight", "25");
}

const sent = (call = 0) =>
  vi.mocked(createSale).mock.calls[call] as [CreateSaleInput, string];

describe("SaleForm", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(createSale).mockReset();
    vi.mocked(updateSale).mockReset();
    vi.mocked(getTodayRates).mockResolvedValue(
      todayRates([
        rate({ commodityId: gandumItem.id, maxRate: "4000.00", avgRate: null }),
      ]),
    );
    vi.mocked(lookupCommodities).mockImplementation(async ({ q }) =>
      [gandumItem, chanaItem].filter((c) =>
        c.name.toLowerCase().includes(q.toLowerCase()),
      ),
    );
    vi.mocked(lookupTraders).mockResolvedValue([BEOPARI]);
    vi.mocked(getTrader).mockResolvedValue(beopariDetail());
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows the live total: gross plus each charge, rounding and net", async () => {
    renderForm();
    await pickCommodity(1, "Gandum");
    await waitFor(() => expect(item(1, "Rate")).toHaveValue("4000"));
    type(1, "Bags", "10");
    type(1, "Weight", "25");

    const lines = within(screen.getByTestId("sale-breakdown"));
    expect(lines.getByText("Gross amount").nextSibling).toHaveTextContent(
      "Rs 100,000.00",
    );
    expect(lines.getByText("Commission 2%").nextSibling).toHaveTextContent(
      "+Rs 2,000.00",
    );
    expect(lines.getByText("Market fee 0.5%").nextSibling).toHaveTextContent(
      "+Rs 500.00",
    );
    expect(
      lines.getByText("Labour Rs 20.00 per bag").nextSibling,
    ).toHaveTextContent("+Rs 200.00");
    expect(lines.getByText("Total charges").nextSibling).toHaveTextContent(
      "+Rs 2,700.00",
    );
    expect(screen.getByTestId("sale-net")).toHaveTextContent("Rs 102,700.00");
    expect(lines.getByText("Net receivable from beopari")).toBeInTheDocument();
    expect(screen.getByTestId("sale-item-0-amount")).toHaveTextContent(
      "Rs 100,000.00",
    );
  });

  it("adds items up and rounds the net once, like the server", async () => {
    renderForm();
    await pickCommodity(1, "Gandum");
    type(1, "Bags", "10");
    type(1, "Weight", "25.008325");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    await pickCommodity(2, "Chana");
    fireEvent.change(item(2, "Weight unit"), { target: { value: "kg" } });
    type(2, "Weight", "250");
    type(2, "Rate", "100");
    fireEvent.change(item(2, "Rate per"), { target: { value: "kg" } });

    // 100,033.30 + 25,000 = 125,033.30; the charges show 3,325.84 but are
    // 3,325.8325 exactly, so the net 128,359.1325 rounds once to 128,359.
    const lines = within(screen.getByTestId("sale-breakdown"));
    expect(lines.getByText("Gross amount").nextSibling).toHaveTextContent(
      "Rs 125,033.30",
    );
    expect(lines.getByText("Commission 2.5%").nextSibling).toHaveTextContent(
      "+Rs 625.00",
    );
    expect(screen.getByTestId("sale-net")).toHaveTextContent("Rs 128,359.00");
    expect(lines.getByText("Rounding").nextSibling).toHaveTextContent(
      "-Rs 0.14",
    );
  });

  it("shows the beopari's balance and credit limit next to the name", async () => {
    renderForm();
    await pickBuyer();

    const balance = await screen.findByTestId("sale-buyer-balance");
    expect(balance).toHaveTextContent(
      "Balance: Rs 20,000.00 receivable Credit limit: Rs 120,000.00",
    );
    expect(getTrader).toHaveBeenCalledWith(BEOPARI.id, expect.anything());
    expect(
      screen.getByRole("combobox", { name: /^Beopari/ }),
    ).toHaveAccessibleDescription(/Rs 20,000.00 receivable/);
  });

  it("says when a beopari has no credit limit", async () => {
    vi.mocked(getTrader).mockResolvedValue(
      beopariDetail({ creditLimit: null, balance: "0.00" }),
    );
    renderForm();
    await pickBuyer();
    expect(await screen.findByTestId("sale-buyer-balance")).toHaveTextContent(
      "Balance: Rs 0.00 settled Credit limit: No limit",
    );
  });

  it("warns before saving when the sale would go over the credit limit", async () => {
    renderForm();
    await pickBuyer();
    await pickCommodity(1, "Gandum");
    await waitFor(() => expect(item(1, "Rate")).toHaveValue("4000"));
    type(1, "Weight", "24");

    // 20,000 + 98,400 = 118,400: under the Rs 120,000 limit.
    expect(screen.getByTestId("sale-net")).toHaveTextContent("Rs 98,400.00");
    expect(screen.queryByTestId("sale-credit-warning")).toBeNull();

    type(1, "Bags", "10");
    type(1, "Weight", "25");
    // 20,000 + 102,700 = 122,700.
    const warning = await screen.findByRole("alert");
    expect(warning).toHaveAttribute("data-testid", "sale-credit-warning");
    expect(warning).toHaveTextContent("Over the credit limit");
    expect(warning).toHaveTextContent(
      "After this sale Shahid Traders would owe Rs 122,700.00, above the credit limit of Rs 120,000.00.",
    );
    expect(createSale).not.toHaveBeenCalled();
  });

  it("sends the sale and tells the user when the server saved it over the limit", async () => {
    vi.mocked(createSale).mockImplementation(async (input) => ({
      sale: savedSale(input, {}, [
        {
          code: "CREDIT_LIMIT_EXCEEDED",
          message:
            "Shahid Traders would owe Rs 122700.00, above the credit limit of Rs 120000.00",
          balance: "122700.00",
          creditLimit: "120000.00",
        },
      ]),
      replayed: false,
    }));
    renderForm();
    await fillTicketSale();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createSale).toHaveBeenCalledTimes(1));
    expect(sent()[0]).toEqual({
      buyerId: BEOPARI.id,
      saleDate: TODAY,
      items: [
        {
          commodityId: gandumItem.id,
          bags: 10,
          weightKg: "1000.000",
          rate: "4000",
          rateUnit: "maund",
        },
      ],
      notes: null,
    });
    expect(sent()[1]).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      await screen.findByText("Saved over the credit limit"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/sales/aaaaaaaa-5555-4555-8555-555555555555",
      ),
    );
  });

  it("a blocked credit limit lands on the beopari and keeps the form and key", async () => {
    const message =
      "Shahid Traders would owe Rs 122700.00, above the credit limit of Rs 120000.00";
    vi.mocked(createSale)
      .mockRejectedValueOnce(
        httpError(undefined, 409, {
          code: "CREDIT_LIMIT_EXCEEDED",
          message,
          errors: [{ field: "buyerId", message }],
        }),
      )
      .mockImplementationOnce(async (input) => ({
        sale: savedSale(input),
        replayed: false,
      }));
    renderForm();
    await fillTicketSale();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Beopari/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.queryByTestId("sale-form-error")).toBeNull();
    expect(item(1, "Weight")).toHaveValue("25");
    expect(push).not.toHaveBeenCalled();

    fireEvent.keyDown(document.body, { key: "s", ctrlKey: true });
    await waitFor(() => expect(createSale).toHaveBeenCalledTimes(2));
    expect(sent(1)[1]).toBe(sent(0)[1]);
  });

  it("validates the beopari and the items before sending", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Choose a beopari")).toBeInTheDocument();
    expect(screen.getByText("Add at least one item")).toBeInTheDocument();
    expect(createSale).not.toHaveBeenCalled();
  });

  it("shows a clear error when the network drops and retries with the same key", async () => {
    vi.mocked(createSale)
      .mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"))
      .mockImplementationOnce(async (input) => ({
        sale: savedSale(input),
        replayed: true,
      }));
    renderForm();
    await fillTicketSale();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByTestId("sale-form-error")).toHaveTextContent(
      /Can’t reach the server, so the sale may not be saved/,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(createSale).toHaveBeenCalledTimes(2));
    expect(sent(1)[1]).toBe(sent(0)[1]);
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("Ctrl+P saves and opens the print view; Enter walks the row", async () => {
    vi.mocked(createSale).mockImplementation(async (input) => ({
      sale: savedSale(input),
      replayed: false,
    }));
    renderForm();
    // A new sale opens on the beopari.
    expect(screen.getByRole("combobox", { name: /^Beopari/ })).toHaveFocus();
    await pickBuyer();
    await pickCommodity(1, "Gandum");
    item(1, "Bags").focus();
    fireEvent.keyDown(item(1, "Bags"), { key: "Enter" });
    expect(item(1, "Weight")).toHaveFocus();
    type(1, "Weight", "25");
    fireEvent.keyDown(item(1, "Weight"), { key: "Enter" });
    expect(item(1, "Rate")).toHaveFocus();
    fireEvent.keyDown(item(1, "Rate"), { key: "Enter" });
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: /^Commodity, Item 2$/ }),
      ).toHaveFocus(),
    );

    fireEvent.keyDown(item(1, "Weight"), { key: "p", ctrlKey: true });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/sales/aaaaaaaa-5555-4555-8555-555555555555?print=1",
      ),
    );
    // The blank second row is not sent.
    expect(sent()[0].items).toHaveLength(1);
  });

  it("edits a sale with its own rates, lots and balance, and shows a closed day", async () => {
    const LOT = "dddddddd-1111-4111-8111-111111111111";
    const sale = savedSale({
      ...ticketSale,
      items: [{ ...ticketSale.items[0], purchaseItemId: LOT }],
    });
    // The balance already holds this sale (20,000 + 102,700).
    vi.mocked(getTrader).mockResolvedValue(
      beopariDetail({ balance: "122700.00" }),
    );
    vi.mocked(updateSale).mockRejectedValue(
      httpError(undefined, 403, { code: "DAY_CLOSED", message: "Day closed" }),
    );
    renderForm({ sale }, manager);

    expect(item(1, "Weight")).toHaveValue("1000");
    expect(screen.getByTestId("sale-net")).toHaveTextContent("Rs 102,700.00");
    expect(
      screen.queryByRole("button", { name: "Save & New" }),
    ).not.toBeInTheDocument();
    await screen.findByTestId("sale-buyer-balance");
    // Saved as it is: nothing new over the limit.
    expect(screen.queryByTestId("sale-credit-warning")).toBeNull();

    type(1, "Weight", "1100");
    // 122,700 − 102,700 + 112,950 = 132,950.
    expect(await screen.findByTestId("sale-credit-warning")).toHaveTextContent(
      "would owe Rs 132,950.00",
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByTestId("sale-form-error")).toHaveTextContent(
      "This day is closed. Only the owner can change a sale of a past day.",
    );
    expect(updateSale).toHaveBeenCalledWith(sale.id, {
      buyerId: BEOPARI.id,
      saleDate: TODAY,
      items: [
        {
          commodityId: gandumItem.id,
          purchaseItemId: LOT,
          bags: 10,
          weightKg: "1100.000",
          rate: "4000",
          rateUnit: "maund",
        },
      ],
      notes: null,
    });
  });
});
