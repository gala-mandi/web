import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { lookupTraders } from "@/features/traders/api";
import { useSessionStore } from "@/stores/session";
import { httpError, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { getFullStatement, getStatement } from "../api";
import { exportStatementToExcel } from "../statement";
import {
  KISSAN,
  PAYMENT_ID,
  PURCHASE_ID,
  SALE_ID,
  statement,
} from "../test-data";
import { KhataPage } from "./khata-page";

const push = vi.hoisted(() => vi.fn());
const print = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock("react-to-print", () => ({ useReactToPrint: () => print }));
vi.mock("../api", () => ({
  getStatement: vi.fn(),
  getFullStatement: vi.fn(),
}));
vi.mock("../statement", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../statement")>()),
  exportStatementToExcel: vi.fn(),
}));
vi.mock("@/features/traders/api", () => ({ lookupTraders: vi.fn() }));

function renderWith(node: ReactNode, user: User, searchParams = "") {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  render(
    <NuqsTestingAdapter searchParams={searchParams} hasMemory>
      <TestProviders>{node}</TestProviders>
    </NuqsTestingAdapter>,
  );
}

const withTrader = `?trader=${KISSAN.id}&from=2026-11-01`;
const row = (text: string) => screen.getByText(text).closest("tr")!;

describe("KhataPage", () => {
  beforeEach(() => {
    push.mockReset();
    print.mockReset();
    vi.mocked(getStatement).mockReset().mockResolvedValue(statement());
    vi.mocked(getFullStatement).mockReset().mockResolvedValue(statement());
    vi.mocked(exportStatementToExcel).mockReset().mockResolvedValue();
    vi.mocked(lookupTraders).mockResolvedValue([
      { ...KISSAN, fatherName: null, phone: null, village: null },
    ]);
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
  });

  afterEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
  });

  it("asks for a trader first and loads nothing", () => {
    renderWith(<KhataPage />, owner);
    expect(screen.getByRole("heading", { name: "Ledger" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Pick a trader" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "All balances" })).toHaveAttribute(
      "href",
      "/ledger/balances",
    );
    expect(getStatement).not.toHaveBeenCalled();
  });

  it("picking a trader loads their khata", async () => {
    renderWith(<KhataPage />, owner);
    fireEvent.click(screen.getByRole("combobox", { name: "Trader" }));
    fireEvent.click(await screen.findByRole("option", { name: /Rafiq Ahmad/ }));
    await screen.findByTestId("khata-closing");
    expect(getStatement).toHaveBeenLastCalledWith(
      KISSAN.id,
      { page: 1, limit: 50 },
      expect.anything(),
    );
  });

  it("shows opening balance, every line with Dr/Cr and running balance, and the closing balance", async () => {
    renderWith(<KhataPage />, owner, withTrader);

    const opening = await screen.findByTestId("khata-opening");
    expect(opening).toHaveTextContent("Before 1 Nov 2026");
    expect(opening).toHaveTextContent("Rs 10,000.00 Dr");
    expect(opening).toHaveTextContent("They owe you");
    const closing = screen.getByTestId("khata-closing");
    expect(closing).toHaveTextContent("Rs 20,500.00 Cr");
    expect(closing).toHaveTextContent("You owe them");
    expect(closing).toHaveTextContent("Up to today");
    expect(getStatement).toHaveBeenLastCalledWith(
      KISSAN.id,
      { page: 1, limit: 50, from: "2026-11-01" },
      expect.anything(),
    );

    expect(screen.getByRole("combobox", { name: "Trader" })).toHaveTextContent(
      "Rafiq Ahmad",
    );
    const purchase = row("Purchase PUR-2026-27-000001");
    expect(purchase).toHaveTextContent("Rs 100,000.00");
    expect(purchase).toHaveTextContent("Rs 90,000.00 Cr");
    const paid = row("Paid on purchase PUR-2026-27-000001");
    expect(paid).toHaveTextContent("Rs 20,000.00");
    expect(paid).toHaveTextContent("Rs 70,000.00 Cr");

    const legend = screen.getByRole("region", {
      name: "How to read the khata",
    });
    expect(legend).toHaveTextContent("Dr (debit): the trader owes you more");
    expect(legend).toHaveTextContent("Cr (credit): you owe the trader more");
  });

  it("links purchases and sales (and their reversals) to their bill, payments to their voucher", async () => {
    renderWith(<KhataPage />, owner, withTrader);
    await screen.findByTestId("khata-closing");

    expect(
      screen.getByRole("link", { name: "Open Purchase PUR-2026-27-000001" }),
    ).toHaveAttribute("href", `/purchases/${PURCHASE_ID}`);
    expect(
      screen.getByRole("link", {
        name: "Open Sale SAL-2026-27-000001 cancelled",
      }),
    ).toHaveAttribute("href", `/sales/${SALE_ID}`);
    expect(
      screen.getByRole("link", { name: "Open Payment PAY-2026-27-000001" }),
    ).toHaveAttribute("href", `/payments/${PAYMENT_ID}`);

    fireEvent.click(row("Paid on purchase PUR-2026-27-000001"));
    expect(push).toHaveBeenCalledWith(`/purchases/${PURCHASE_ID}`);
    push.mockReset();
    fireEvent.click(row("Payment PAY-2026-27-000001"));
    expect(push).toHaveBeenCalledWith(`/payments/${PAYMENT_ID}`);
    push.mockReset();
    fireEvent.click(row("Rounding agreed with Rafiq"));
    expect(push).not.toHaveBeenCalled();
  });

  it("marks the owner's adjustments clearly", async () => {
    renderWith(<KhataPage />, owner, withTrader);
    await screen.findByTestId("khata-closing");
    const adjustment = row("Rounding agreed with Rafiq");
    expect(
      within(adjustment).getByText("Adjustment").closest("[data-source]"),
    ).toHaveAttribute("data-source", "adjustment");
    expect(adjustment).toHaveTextContent("Adjustment by the owner");
    expect(adjustment).toHaveTextContent("Rs 19,500.00 Cr");
  });

  it("pages a long khata on the server", async () => {
    vi.mocked(getStatement).mockResolvedValue(
      statement({ meta: { page: 2, limit: 50, total: 180 } }),
    );
    renderWith(<KhataPage />, owner, `${withTrader}&page=2`);
    await screen.findByTestId("khata-closing");
    expect(getStatement).toHaveBeenLastCalledWith(
      KISSAN.id,
      { page: 2, limit: 50, from: "2026-11-01" },
      expect.anything(),
    );
    expect(screen.getByText("Page 2 of 4")).toBeVisible();
  });

  it("prints the whole period, not only the page on screen", async () => {
    const long = statement({
      data: Array.from({ length: 3 }, (_, n) =>
        statement().data.map((e) => ({ ...e, id: e.id + 100 * (n + 1) })),
      ).flat(),
    });
    vi.mocked(getFullStatement).mockResolvedValue(long);
    renderWith(<KhataPage />, owner, withTrader);
    await screen.findByTestId("khata-closing");

    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(getFullStatement).toHaveBeenCalledWith(
      KISSAN.id,
      { from: "2026-11-01", to: undefined },
      expect.anything(),
    );
    const doc = document.querySelector("[data-statement]")!;
    expect(doc).toHaveAttribute("dir", "ltr");
    expect(doc.querySelectorAll("tbody tr")).toHaveLength(15 + 2);
    expect(
      doc.querySelector("[data-testid=statement-closing]"),
    ).toHaveTextContent("Rs 20,500.00 Cr");
  });

  it("prints an Urdu statement right to left", async () => {
    renderWith(<KhataPage />, owner, withTrader);
    await screen.findByTestId("khata-closing");

    fireEvent.click(
      screen.getByRole("combobox", { name: "Statement language" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "اردو" }));
    fireEvent.click(screen.getByRole("button", { name: "PDF" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const doc = document.querySelector("[data-statement]")!;
    expect(doc).toHaveAttribute("dir", "rtl");
    expect(doc).toHaveAttribute("lang", "ur");
    expect(doc).toHaveTextContent("کھاتہ اسٹیٹمنٹ");
    expect(
      doc.querySelector("[data-testid=statement-closing]"),
    ).toHaveTextContent("Rs 20,500.00 جمع");
    expect(
      await screen.findByText("In the print window, choose “Save as PDF”."),
    ).toBeVisible();
  });

  it("exports the statement to Excel in the chosen language", async () => {
    renderWith(<KhataPage />, owner, withTrader);
    await screen.findByTestId("khata-closing");
    fireEvent.click(screen.getByRole("button", { name: "Excel" }));
    await waitFor(() =>
      expect(exportStatementToExcel).toHaveBeenCalledWith(
        statement(),
        "en",
        "Demo Mandi",
      ),
    );
  });

  it("a trader of another shop is not found", async () => {
    vi.mocked(getStatement).mockRejectedValue(httpError(undefined, 404));
    renderWith(<KhataPage />, owner, withTrader);
    expect(
      await screen.findByRole("heading", { name: "Trader not found" }),
    ).toBeVisible();
  });

  it("operators can't open the khata", () => {
    renderWith(<KhataPage />, operator, withTrader);
    expect(
      screen.getByRole("heading", { name: "You don’t have access" }),
    ).toBeVisible();
    expect(getStatement).not.toHaveBeenCalled();
  });
});
