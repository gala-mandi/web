import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { useSessionStore } from "@/stores/session";
import { manager, operator } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { listBalances } from "../api";
import { balances, KISSAN, traderBalance } from "../test-data";
import { BalancesPage } from "./balances-page";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock("../api", () => ({ listBalances: vi.fn() }));

const BEOPARI_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const shahid = traderBalance({
  traderId: BEOPARI_ID,
  type: "beopari",
  name: "Shahid Traders",
  phone: null,
  balance: "75000.00",
  receivable: "75000.00",
  payable: "0.00",
});
const rafiq = traderBalance();

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

const lastQuery = () => vi.mocked(listBalances).mock.calls.at(-1)?.[0];

describe("BalancesPage", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(listBalances)
      .mockReset()
      .mockResolvedValue(balances([shahid, rafiq]));
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
  });

  afterEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
  });

  it("lists every trader's receivable and payable, largest amount first, with the totals", async () => {
    renderWith(<BalancesPage />, manager);

    const shahidLink = await screen.findByRole("link", {
      name: "Shahid Traders",
    });
    expect(shahidLink).toHaveAttribute("href", `/ledger?trader=${BEOPARI_ID}`);
    const shahidRow = shahidLink.closest("tr")!;
    expect(shahidRow).toHaveTextContent("Beopari");
    expect(shahidRow.querySelector("[data-side=debit]")).toHaveTextContent(
      "Rs 75,000.00",
    );
    expect(shahidRow.querySelector("[data-side=credit]")).toBeNull();

    const rafiqRow = screen
      .getByRole("link", { name: KISSAN.name })
      .closest("tr")!;
    expect(rafiqRow.querySelector("[data-side=credit]")).toHaveTextContent(
      "Rs 20,500.00",
    );
    expect(rafiqRow).toHaveTextContent("03001112223");

    expect(screen.getByTestId("balances-total-receivable")).toHaveTextContent(
      "Rs 75,000.00",
    );
    expect(screen.getByTestId("balances-total-payable")).toHaveTextContent(
      "Rs 20,500.00",
    );
    expect(lastQuery()).toEqual({ page: 1, limit: 20, sort: "-balance" });
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Largest receivable first",
    );

    fireEvent.click(rafiqRow);
    expect(push).toHaveBeenCalledWith(`/ledger?trader=${KISSAN.id}`);
  });

  it("sends search, type and sort from the URL", async () => {
    renderWith(<BalancesPage />, manager, "?q=raf&type=kissan&sort=balance");
    await screen.findByRole("link", { name: KISSAN.name });
    expect(lastQuery()).toEqual({
      page: 1,
      limit: 20,
      sort: "balance",
      search: "raf",
      type: "kissan",
    });
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Largest payable first",
    );
  });

  it("sorts by payable first from the Sort by menu", async () => {
    const { onUrlUpdate } = renderWith(<BalancesPage />, manager);
    await screen.findByRole("link", { name: KISSAN.name });
    fireEvent.click(screen.getByRole("combobox", { name: "Sort by" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Largest payable first" }),
    );
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
        "?sort=balance",
      ),
    );
    await waitFor(() => expect(lastQuery()?.sort).toBe("balance"));
  });

  it("shows an empty state", async () => {
    vi.mocked(listBalances).mockResolvedValue(balances([]));
    renderWith(<BalancesPage />, manager);
    expect(
      await screen.findByRole("heading", { name: "No traders yet" }),
    ).toBeVisible();
  });

  it("operators can't open balances", () => {
    renderWith(<BalancesPage />, operator);
    expect(
      screen.getByRole("heading", { name: "You don’t have access" }),
    ).toBeVisible();
    expect(listBalances).not.toHaveBeenCalled();
  });
});
