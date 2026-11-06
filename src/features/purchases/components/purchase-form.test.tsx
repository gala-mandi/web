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
import { lookupTraders } from "@/features/traders/api";
import { useSessionStore } from "@/stores/session";
import { httpError, operator } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { createPurchase, updatePurchase } from "../api";
import {
  chanaItem,
  gandumItem,
  KISSAN,
  savedPurchase,
  ticketInput,
  TODAY,
} from "../test-data";
import type { CreatePurchaseInput } from "../types";
import { PurchaseForm } from "./purchase-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../api", () => ({
  createPurchase: vi.fn(),
  updatePurchase: vi.fn(),
}));
vi.mock("@/features/rates/api", () => ({ getTodayRates: vi.fn() }));
vi.mock("@/features/commodities/api", () => ({ lookupCommodities: vi.fn() }));
vi.mock("@/features/traders/api", () => ({ lookupTraders: vi.fn() }));

function renderForm(
  props: Partial<Parameters<typeof PurchaseForm>[0]> = {},
  user: User = operator,
) {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  return render(
    <TestProviders>
      <PurchaseForm today={TODAY} {...props} />
    </TestProviders>,
  );
}

const item = (n: number, label: string) =>
  screen.getByLabelText(new RegExp(`^${label}, Item ${n}$`));

async function pickTrader() {
  fireEvent.click(screen.getByRole("combobox", { name: "Kissan" }));
  fireEvent.click(await screen.findByRole("option", { name: /Rafiq Ahmad/ }));
  await closed();
}

/** The picker's popover is gone and focus is back on its button. */
async function closed() {
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  await new Promise((resolve) => setTimeout(resolve, 0));
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

const breakdown = () => screen.getByTestId("purchase-breakdown");
const sent = (call = 0) =>
  vi.mocked(createPurchase).mock.calls[call] as [CreatePurchaseInput, string];

describe("PurchaseForm", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(createPurchase).mockReset();
    vi.mocked(updatePurchase).mockReset();
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
    vi.mocked(lookupTraders).mockResolvedValue([KISSAN]);
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows the live breakdown: gross, each deduction, rounding and net", async () => {
    renderForm();
    await pickCommodity(1, "Gandum");
    // Today's rate is pre-filled.
    await waitFor(() => expect(item(1, "Rate")).toHaveValue("4000"));
    type(1, "Bags", "10");
    type(1, "Weight", "25");

    const lines = within(breakdown());
    expect(lines.getByText("Gross amount").nextSibling).toHaveTextContent(
      "Rs 100,000.00",
    );
    expect(lines.getByText("Commission 2%").nextSibling).toHaveTextContent(
      "-Rs 2,000.00",
    );
    expect(lines.getByText("Market fee 0.5%").nextSibling).toHaveTextContent(
      "-Rs 500.00",
    );
    expect(
      lines.getByText("Labour Rs 20.00 per bag").nextSibling,
    ).toHaveTextContent("-Rs 200.00");
    expect(lines.getByText("Total deductions").nextSibling).toHaveTextContent(
      "-Rs 2,700.00",
    );
    expect(screen.getByTestId("purchase-net")).toHaveTextContent(
      "Rs 97,300.00",
    );
    expect(screen.getByTestId("purchase-item-0-amount")).toHaveTextContent(
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

    // 1000.333 kg × 4000 ÷ 40 = 100,033.30; 250 kg × 100 = 25,000.
    expect(screen.getByTestId("purchase-item-0-amount")).toHaveTextContent(
      "Rs 100,033.30",
    );
    expect(screen.getByTestId("purchase-item-1-amount")).toHaveTextContent(
      "Rs 25,000.00",
    );
    const lines = within(breakdown());
    expect(lines.getByText("Gross amount").nextSibling).toHaveTextContent(
      "Rs 125,033.30",
    );
    expect(lines.getByText("Commission 2.5%").nextSibling).toHaveTextContent(
      "-Rs 625.00",
    );
    expect(screen.getByTestId("purchase-net")).toHaveTextContent(
      "Rs 121,707.00",
    );
    expect(lines.getByText("Rounding").nextSibling).toHaveTextContent(
      "-Rs 0.46",
    );
  });

  it("pre-fills today's rate and lets the operator change it", async () => {
    vi.mocked(getTodayRates).mockResolvedValue(
      todayRates([
        rate({
          commodityId: gandumItem.id,
          avgRate: "4100.00",
          rateUnit: "kg",
        }),
      ]),
    );
    renderForm();
    await pickCommodity(1, "Gandum");

    await waitFor(() => expect(item(1, "Rate")).toHaveValue("4100"));
    expect(item(1, "Rate per")).toHaveValue("kg");
    expect(screen.getByTestId("purchase-item-0-rate-hint")).toHaveTextContent(
      "Today’s rate",
    );

    type(1, "Rate", "4050");
    expect(item(1, "Rate")).toHaveValue("4050");
    expect(screen.getByTestId("purchase-item-0-rate-hint")).toHaveTextContent(
      "Today’s rate is Rs 4,100.00 per kg",
    );
  });

  it("sends a weight typed in maund as kg", async () => {
    vi.mocked(createPurchase).mockImplementation(async (input) => ({
      purchase: savedPurchase(input),
      replayed: false,
    }));
    renderForm();
    await pickTrader();
    await pickCommodity(1, "Gandum");
    type(1, "Bags", "10");
    type(1, "Weight", "25.25");
    expect(screen.getByTestId("purchase-item-0-kg")).toHaveTextContent(
      "= 1,010 kg (25 mn 10 kg)",
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createPurchase).toHaveBeenCalledTimes(1));
    expect(sent()[0]).toEqual({
      traderId: KISSAN.id,
      purchaseDate: TODAY,
      items: [
        {
          commodityId: gandumItem.id,
          bags: 10,
          weightKg: "1010.000",
          rate: "4000",
          rateUnit: "maund",
        },
      ],
      notes: null,
    });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/purchases/55555555-5555-4555-8555-555555555555",
      ),
    );
  });

  it("switching the weight unit converts what was typed", async () => {
    renderForm();
    await pickCommodity(1, "Gandum");
    type(1, "Weight", "25.25");

    fireEvent.change(item(1, "Weight unit"), { target: { value: "kg" } });
    expect(item(1, "Weight")).toHaveValue("1010");
    expect(screen.getByTestId("purchase-item-0-kg")).toHaveTextContent(
      "= 1,010 kg (25 mn 10 kg)",
    );

    type(1, "Weight", "1015.5");
    fireEvent.change(item(1, "Weight unit"), { target: { value: "maund" } });
    expect(item(1, "Weight")).toHaveValue("25.3875");
    expect(screen.getByTestId("purchase-item-0-kg")).toHaveTextContent(
      "= 1,015.5 kg (25 mn 15.5 kg)",
    );
    // The total didn't move: same kg either way.
    expect(screen.getByTestId("purchase-item-0-amount")).toHaveTextContent(
      "Rs 101,550.00",
    );
  });

  it("validates the kissan, the items and each row before sending", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Choose a kissan")).toBeInTheDocument();
    expect(screen.getByText("Add at least one item")).toBeInTheDocument();

    await pickCommodity(1, "Chana");
    type(1, "Weight", "12 mn");
    type(1, "Rate", "0");
    fireEvent.change(item(1, "Rate per"), { target: { value: "bag" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Enter the weight in maund (up to 6 decimals)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter a rate above 0")).toBeInTheDocument();
    expect(
      screen.getByText("Enter the bags for a per-bag rate"),
    ).toBeInTheDocument();
    expect(item(1, "Weight")).toHaveAttribute("aria-invalid", "true");
    expect(createPurchase).not.toHaveBeenCalled();
  });

  it("puts the server's field errors on the right row, skipping blank rows", async () => {
    vi.mocked(createPurchase).mockRejectedValue(
      httpError(undefined, 400, {
        message: "Validation failed",
        errors: [{ field: "items.1.weightKg", message: "Weight too large" }],
      }),
    );
    renderForm();
    await pickTrader();
    await pickCommodity(1, "Gandum");
    type(1, "Weight", "25");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    await pickCommodity(3, "Chana");
    type(3, "Weight", "10");
    type(3, "Rate", "3000");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Row 2 was blank, so the server's item 1 is form row 3.
    await waitFor(() =>
      expect(item(3, "Weight")).toHaveAttribute("aria-invalid", "true"),
    );
    expect(sent()[0].items).toHaveLength(2);
    expect(screen.getByText("Weight too large")).toBeInTheDocument();
    expect(item(1, "Weight")).not.toHaveAttribute("aria-invalid");
  });

  it("shows a clear error when the network drops and retries with the same key", async () => {
    vi.mocked(createPurchase)
      .mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"))
      .mockImplementationOnce(async (input) => ({
        purchase: savedPurchase(input),
        replayed: true,
      }));
    renderForm();
    await pickTrader();
    await pickCommodity(1, "Gandum");
    type(1, "Weight", "25");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByTestId("purchase-form-error")).toHaveTextContent(
      /Can’t reach the server.*won’t be saved twice/,
    );
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(createPurchase).toHaveBeenCalledTimes(2));
    const [, firstKey] = sent(0);
    const [, retryKey] = sent(1);
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(retryKey).toBe(firstKey);
    // A replay (200) is shown as saved too.
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("Ctrl+S saves, Ctrl+P saves and opens the print view", async () => {
    vi.mocked(createPurchase).mockImplementation(async (input) => ({
      purchase: savedPurchase(input),
      replayed: false,
    }));
    renderForm();
    await pickTrader();
    await pickCommodity(1, "Gandum");
    type(1, "Weight", "25");

    fireEvent.keyDown(item(1, "Weight"), { key: "p", ctrlKey: true });

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/purchases/55555555-5555-4555-8555-555555555555?print=1",
      ),
    );
    expect(createPurchase).toHaveBeenCalledTimes(1);
  });

  it("Save & New clears the bill and uses a new key for the next one", async () => {
    vi.mocked(createPurchase).mockImplementation(async (input) => ({
      purchase: savedPurchase(input),
      replayed: false,
    }));
    renderForm();
    await pickTrader();
    await pickCommodity(1, "Gandum");
    type(1, "Weight", "25");
    fireEvent.click(screen.getByRole("button", { name: "Save & New" }));

    await waitFor(() => expect(item(1, "Weight")).toHaveValue(""));
    expect(screen.getByRole("combobox", { name: "Kissan" })).toHaveTextContent(
      "Choose a kissan…",
    );
    expect(push).not.toHaveBeenCalled();

    await pickTrader();
    await pickCommodity(1, "Gandum");
    type(1, "Weight", "30");
    fireEvent.keyDown(document.body, { key: "s", ctrlKey: true });
    await waitFor(() => expect(createPurchase).toHaveBeenCalledTimes(2));
    expect(sent(1)[1]).not.toBe(sent(0)[1]);
  });

  it("Enter walks the row and adds the next item on the last rate", async () => {
    renderForm();
    await pickCommodity(1, "Gandum");
    item(1, "Bags").focus();
    fireEvent.keyDown(item(1, "Bags"), { key: "Enter" });
    expect(item(1, "Weight")).toHaveFocus();
    fireEvent.keyDown(item(1, "Weight"), { key: "Enter" });
    expect(item(1, "Rate")).toHaveFocus();
    type(1, "Weight", "25");
    fireEvent.keyDown(item(1, "Rate"), { key: "Enter" });

    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: /^Commodity, Item 2$/ }),
      ).toHaveFocus(),
    );
  });

  it("edits a saved purchase with its own rates and shows a closed day", async () => {
    const purchase = savedPurchase(ticketInput);
    vi.mocked(updatePurchase).mockRejectedValue(
      httpError(undefined, 403, { code: "DAY_CLOSED", message: "Day closed" }),
    );
    renderForm({ purchase });

    expect(item(1, "Weight")).toHaveValue("1000");
    expect(item(1, "Weight unit")).toHaveValue("kg");
    expect(screen.getByTestId("purchase-net")).toHaveTextContent(
      "Rs 97,300.00",
    );
    expect(
      screen.queryByRole("button", { name: "Save & New" }),
    ).not.toBeInTheDocument();

    type(1, "Weight", "1200");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByTestId("purchase-form-error")).toHaveTextContent(
      "This day is closed",
    );
    expect(updatePurchase).toHaveBeenCalledWith(purchase.id, {
      traderId: KISSAN.id,
      purchaseDate: TODAY,
      items: [
        {
          commodityId: gandumItem.id,
          bags: 10,
          weightKg: "1200.000",
          rate: "4000",
          rateUnit: "maund",
        },
      ],
      notes: null,
    });
  });
});
