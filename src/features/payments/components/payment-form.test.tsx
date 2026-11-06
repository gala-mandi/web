import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listPurchases } from "@/features/purchases/api";
import { KISSAN } from "@/features/purchases/test-data";
import { getTrader, lookupTraders } from "@/features/traders/api";
import { traderDetail } from "@/features/traders/test-data";
import { useSessionStore } from "@/stores/session";
import { httpError, operator } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { createPayment } from "../api";
import {
  openBills,
  rafiqBills,
  savedPayment,
  TODAY,
  withWarnings,
} from "../test-data";
import type { CreatePaymentInput } from "../types";
import { PaymentForm } from "./payment-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../api", () => ({ createPayment: vi.fn() }));
vi.mock("@/features/purchases/api", () => ({
  IDEMPOTENCY_HEADER: "Idempotency-Key",
  listPurchases: vi.fn(),
}));
vi.mock("@/features/traders/api", () => ({
  lookupTraders: vi.fn(),
  getTrader: vi.fn(),
}));

function renderForm() {
  useSessionStore.getState().setSession({ accessToken: "t", user: operator });
  return render(
    <TestProviders>
      <PaymentForm direction="paid" today={TODAY} />
    </TestProviders>,
  );
}

/** The picker's popover is gone and focus is back on its button. */
async function closed() {
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function pickKissan() {
  fireEvent.click(screen.getByRole("combobox", { name: /^Kissan/ }));
  fireEvent.click(await screen.findByRole("option", { name: /Rafiq Ahmad/ }));
  await closed();
  await screen.findAllByTestId("allocation-row");
}

const amount = () => screen.getByLabelText("Amount (Rs)");
const typeAmount = (value: string) =>
  fireEvent.change(amount(), { target: { value } });
const share = (billNo: string) =>
  screen.getByRole("textbox", { name: `Allocate to ${billNo}` });
const rows = () => screen.getAllByTestId("allocation-row");
const summary = () => ({
  allocated: screen.getByTestId("payment-allocated"),
  advance: screen.getByTestId("payment-advance"),
});
const mode = () => screen.getByTestId("allocation-mode");
const sent = (call = 0) =>
  vi.mocked(createPayment).mock.calls[call] as [CreatePaymentInput, string];

const [b1, b2, b3] = openBills;

describe("PaymentForm allocation", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(createPayment).mockReset();
    vi.mocked(listPurchases).mockResolvedValue(rafiqBills);
    vi.mocked(lookupTraders).mockResolvedValue([KISSAN]);
    vi.mocked(getTrader).mockResolvedValue(
      traderDetail({ ...KISSAN, cnic: null, balance: "-180000.00" }),
    );
  });

  afterEach(() => useSessionStore.getState().clear());

  it("asks for a kissan before listing bills", () => {
    renderForm();
    expect(
      screen.getByText("Choose a kissan to see his outstanding bills."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("allocation-row")).toBeNull();
  });

  it("select kissan → his outstanding bills, oldest first → amount → allocated automatically", async () => {
    renderForm();
    await pickKissan();

    // Only the posted bills with something left, asked for by this kissan.
    expect(listPurchases).toHaveBeenCalledWith(
      {
        page: 1,
        limit: 100,
        trader: KISSAN.id,
        status: "posted",
        sort: "-purchaseDate",
      },
      expect.anything(),
    );
    expect(rows().map((row) => row.dataset.bill)).toEqual([
      b1.billNo,
      b2.billNo,
      b3.billNo,
    ]);
    expect(rows()[0]).toHaveTextContent("Rs 60,000.00Rs 30,000.00");
    expect(screen.getByTestId("payment-trader-balance")).toHaveTextContent(
      "Khata balance: Rs 180,000.00 payable",
    );

    typeAmount("40000");
    expect(mode()).toHaveAttribute("data-mode", "auto");
    expect(share(b1.billNo)).toHaveValue("30000.00");
    expect(share(b2.billNo)).toHaveValue("10000.00");
    expect(share(b3.billNo)).toHaveValue("");
    expect(within(rows()[0]).getByText("Settled")).toBeInTheDocument();
    expect(within(rows()[1]).getByText("Part")).toBeInTheDocument();
    expect(rows()[1]).toHaveTextContent("Rs 40,000.00");
    expect(summary().allocated).toHaveTextContent("Rs 40,000.00");
    expect(summary().advance).toHaveTextContent("Rs 0.00");
    expect(screen.getByTestId("allocation-total")).toHaveTextContent(
      "Rs 40,000.00",
    );

    // More than every bill: all settled, the rest is the advance.
    typeAmount("200000");
    expect(share(b3.billNo)).toHaveValue("100000.00");
    expect(summary().allocated).toHaveTextContent("Rs 180,000.00");
    expect(summary().advance).toHaveTextContent("Rs 20,000.00");
  });

  it("saves the auto split as bills oldest first, without amounts, with one key", async () => {
    vi.mocked(createPayment).mockResolvedValue({
      payment: withWarnings(savedPayment()),
      replayed: false,
    });
    renderForm();
    await pickKissan();
    typeAmount("100000");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/payments/${savedPayment().id}`),
    );
    const [input, key] = sent();
    expect(input).toEqual({
      direction: "paid",
      traderId: KISSAN.id,
      paymentDate: TODAY,
      amount: "100000",
      method: "cash",
      reference: null,
      notes: null,
      allocations: [
        { purchaseId: b1.id },
        { purchaseId: b2.id },
        { purchaseId: b3.id },
      ],
    });
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      await screen.findByText("Payment saved: PAY-2026-27-000001"),
    ).toBeInTheDocument();
  });

  it("typing in a row overrides the split; Auto-allocate brings it back", async () => {
    vi.mocked(createPayment).mockResolvedValue({
      payment: withWarnings(savedPayment()),
      replayed: false,
    });
    renderForm();
    await pickKissan();
    typeAmount("40000");

    // Pay the newest bill instead: the split starts from what was shown.
    fireEvent.change(share(b3.billNo), { target: { value: "15000" } });
    expect(mode()).toHaveAttribute("data-mode", "manual");
    expect(share(b1.billNo)).toHaveValue("30000.00");
    expect(share(b2.billNo)).toHaveValue("10000.00");
    expect(summary().allocated).toHaveTextContent("Rs 55,000.00");
    expect(summary().advance).toHaveTextContent("-Rs 15,000.00");
    expect(screen.getByText("More than the amount")).toBeInTheDocument();

    // The amount no longer moves a split typed by hand.
    fireEvent.change(share(b2.billNo), { target: { value: "" } });
    fireEvent.change(share(b1.billNo), { target: { value: "20000" } });
    typeAmount("45000");
    expect(share(b1.billNo)).toHaveValue("20000");
    expect(summary().allocated).toHaveTextContent("Rs 35,000.00");
    expect(summary().advance).toHaveTextContent("Rs 10,000.00");

    // A share above what the bill has left is stopped before saving.
    fireEvent.change(share(b1.billNo), { target: { value: "35000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Only Rs 30,000.00 is left on this bill"),
    ).toBeInTheDocument();
    expect(share(b1.billNo)).toHaveAttribute("aria-invalid", "true");
    expect(createPayment).not.toHaveBeenCalled();

    // Fixed: each typed bill goes with its amount, the rest is an advance.
    fireEvent.change(share(b1.billNo), { target: { value: "20000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(createPayment).toHaveBeenCalledTimes(1));
    expect(sent()[0].allocations).toEqual([
      { purchaseId: b1.id, amount: "20000" },
      { purchaseId: b3.id, amount: "15000" },
    ]);
  });

  it("goes back to the oldest-first split, or clears every bill", async () => {
    renderForm();
    await pickKissan();
    typeAmount("40000");
    fireEvent.change(share(b3.billNo), { target: { value: "15000" } });

    fireEvent.click(
      screen.getByRole("button", { name: "Auto-allocate oldest first" }),
    );
    expect(mode()).toHaveAttribute("data-mode", "auto");
    expect(share(b3.billNo)).toHaveValue("");
    expect(share(b2.billNo)).toHaveValue("10000.00");

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(mode()).toHaveAttribute("data-mode", "manual");
    for (const bill of openBills) expect(share(bill.billNo)).toHaveValue("");
    expect(summary().advance).toHaveTextContent("Rs 40,000.00");
  });

  it("shows the shop's over-payment block on the amount and keeps the form and key", async () => {
    const message =
      "The shop owes Rafiq Ahmad Rs 180000.00; this payment is Rs 20000.00 more (an advance)";
    vi.mocked(createPayment)
      .mockRejectedValueOnce(
        httpError(undefined, 409, {
          code: "OVERPAYMENT",
          message,
          errors: [{ field: "amount", message }],
        }),
      )
      .mockResolvedValueOnce({
        payment: withWarnings(savedPayment()),
        replayed: false,
      });
    renderForm();
    await pickKissan();
    typeAmount("200000");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(amount()).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();

    typeAmount("180000");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(createPayment).toHaveBeenCalledTimes(2));
    expect(sent(1)[1]).toBe(sent(0)[1]);
  });

  it("puts the server's bill error on that bill's row", async () => {
    vi.mocked(createPayment).mockRejectedValue(
      httpError(undefined, 400, {
        message: "Validation failed",
        errors: [
          {
            field: "allocations.1.purchaseId",
            message: "Nothing is left to settle on bill PUR-2026-27-000002",
          },
        ],
      }),
    );
    renderForm();
    await pickKissan();
    typeAmount("40000");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const row = within(rows()[1]);
    expect(
      await row.findByText(
        "Nothing is left to settle on bill PUR-2026-27-000002",
      ),
    ).toBeInTheDocument();
  });

  it("warns after a save above what the khata owed (saved as an advance)", async () => {
    const message =
      "The shop owes Rafiq Ahmad Rs 180000.00; this payment is Rs 20000.00 more (an advance)";
    vi.mocked(createPayment).mockResolvedValue({
      payment: withWarnings(
        savedPayment({ amount: "200000.00", advance: "20000.00" }),
        [
          {
            code: "OVERPAYMENT",
            message,
            owed: "180000.00",
            excess: "20000.00",
          },
        ],
      ),
      replayed: false,
    });
    renderForm();
    await pickKissan();
    typeAmount("200000");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Saved with an advance"),
    ).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("with no outstanding bills, the whole amount is an advance", async () => {
    vi.mocked(listPurchases).mockResolvedValue({
      data: [rafiqBills.data[0]],
      meta: { page: 1, limit: 100, total: 1 },
    });
    renderForm();
    fireEvent.click(screen.getByRole("combobox", { name: /^Kissan/ }));
    fireEvent.click(await screen.findByRole("option", { name: /Rafiq Ahmad/ }));
    await closed();
    expect(await screen.findByTestId("no-outstanding-bills")).toHaveTextContent(
      "No outstanding bills",
    );
    typeAmount("5000");
    expect(summary().advance).toHaveTextContent("Rs 5,000.00");
  });
});
