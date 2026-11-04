import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { useSessionStore } from "@/stores/session";
import { httpError, manager, operator, owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { getTrader } from "../api";
import { traderDetail } from "../test-data";
import { TraderProfile } from "./trader-profile";

vi.mock("../api", () => ({ getTrader: vi.fn() }));

const ID = "11111111-1111-4111-8111-111111111111";

function renderProfile(user: User = owner, id = ID) {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  render(
    <TestProviders>
      <TraderProfile id={id} />
    </TestProviders>,
  );
}

function balanceCard() {
  return screen.getByRole("region", { name: "Current balance" });
}

describe("TraderProfile", () => {
  beforeEach(() => {
    vi.mocked(getTrader).mockReset();
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows the details, the balance and where transactions will appear", async () => {
    vi.mocked(getTrader).mockResolvedValue(
      traderDetail({ creditLimit: "200000.00", notes: "Pays on Fridays" }),
    );
    renderProfile();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Muhammad Aslam" }),
    ).toBeVisible();
    expect(getTrader).toHaveBeenCalledWith(ID, expect.anything());
    const details = screen.getByRole("region", { name: "Details" });
    expect(details).toHaveTextContent("Kissan");
    expect(details).toHaveTextContent("Muhammad Akram");
    expect(details).toHaveTextContent("03001234567");
    expect(details).toHaveTextContent("35202-1234567-1");
    expect(details).toHaveTextContent("Chak 45");
    expect(details).toHaveTextContent("Rs 50,000.00 Debit");
    expect(details).toHaveTextContent("Rs 200,000.00");
    expect(details).toHaveTextContent("Pays on Fridays");
    expect(details).toHaveTextContent("27 Oct 2026");
    expect(
      screen.getByRole("heading", { name: "Recent transactions" }),
    ).toBeVisible();
    expect(
      screen.getByText(/Purchases, sales and payments with this trader/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Back to traders" }),
    ).toHaveAttribute("href", "/traders");
  });

  it.each([
    ["50000.00", "Rs 50,000.00", "Receivable", "Muhammad Aslam owes the shop"],
    ["-1250.50", "Rs 1,250.50", "Payable", "The shop owes Muhammad Aslam"],
    ["0.00", "Rs 0.00", "Settled", "Nothing is owed either way"],
  ])("balance %s reads %s %s", async (balance, amount, label, hint) => {
    vi.mocked(getTrader).mockResolvedValue(traderDetail({ balance }));
    renderProfile();

    await screen.findByRole("heading", { level: 1 });
    const card = balanceCard();
    expect(within(card).getByTestId("trader-balance")).toHaveTextContent(
      amount,
    );
    expect(within(card).getByText(label)).toBeVisible();
    expect(card).toHaveTextContent(hint);
  });

  it("opens the edit sheet", async () => {
    vi.mocked(getTrader).mockResolvedValue(traderDetail());
    renderProfile(manager);

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(
      await screen.findByRole("dialog", { name: "Edit Muhammad Aslam" }),
    ).toBeVisible();
  });

  it.each([404, 400])("shows the not-found page for a %s", async (status) => {
    vi.mocked(getTrader).mockRejectedValue(httpError(undefined, status));
    renderProfile(owner, "nope");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
    expect(getTrader).toHaveBeenCalledTimes(1);
  });

  it("shows an error with retry", async () => {
    // One automatic retry, then the error shows.
    vi.mocked(getTrader).mockRejectedValue(new Error("Network Error"));
    renderProfile();

    expect(
      await screen.findByRole("heading", { name: "Couldn’t load this trader" }),
    ).toBeVisible();
    vi.mocked(getTrader).mockResolvedValue(traderDetail());
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Muhammad Aslam" }),
    ).toBeVisible();
  });

  it("shows 403 to an operator and asks the server for nothing", () => {
    renderProfile(operator);

    expect(
      screen.getByRole("heading", { name: "You don’t have access" }),
    ).toBeVisible();
    expect(getTrader).not.toHaveBeenCalled();
  });
});
