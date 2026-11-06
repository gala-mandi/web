import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatRs } from "@/lib/format";
import { dailySummary, emptyShop } from "../test-data";
import { KpiTiles } from "./kpi-tiles";

const tile = (id: string) =>
  document.querySelector(`[data-tile="${id}"]`) as HTMLElement;

describe("KpiTiles", () => {
  it("shows the daily summary's own figures, formatted, in four cards", () => {
    render(<KpiTiles summary={dailySummary} />);

    const section = screen.getByRole("region", { name: "Today’s position" });
    expect(section.querySelectorAll('[data-slot="card"]')).toHaveLength(4);

    const cases = [
      ["purchases", "Purchases", dailySummary.purchases.netAmount],
      ["sales", "Sales", dailySummary.sales.netAmount],
      ["commission", "Commission", dailySummary.commission.total],
      ["cash", "Cash in hand", dailySummary.cash.closingCash],
    ] as const;
    for (const [id, label, amount] of cases) {
      const card = tile(id);
      expect(within(card).getByText(label)).toBeInTheDocument();
      expect(within(card).getByText(formatRs(amount))).toBeInTheDocument();
      // The exact server string, not a recalculated number.
      expect(card.querySelector("[data-amount]")).toHaveAttribute(
        "data-amount",
        amount,
      );
    }
  });

  it("explains each figure underneath", () => {
    render(<KpiTiles summary={dailySummary} />);

    expect(tile("purchases")).toHaveTextContent(
      `${dailySummary.purchases.bills} bills · ${dailySummary.purchases.bags.toLocaleString("en-PK")} bags`,
    );
    expect(tile("commission")).toHaveTextContent(
      "Purchases Rs 15,620.40 · Sales Rs 13,245.10",
    );
    expect(tile("cash")).toHaveTextContent(
      "In Rs 380,500.00 · Out Rs 295,000.00",
    );
  });

  it("shows zero, singular words and no minus for an empty day", () => {
    render(
      <KpiTiles
        summary={{
          ...emptyShop.summary,
          purchases: { ...emptyShop.summary.purchases, bills: 1, bags: 1 },
        }}
      />,
    );

    expect(within(tile("purchases")).getByText("Rs 0.00")).toBeInTheDocument();
    expect(tile("purchases")).toHaveTextContent("1 bill · 1 bag");
    expect(tile("sales")).toHaveTextContent("0 bills · 0 bags");
  });

  it("shows a skeleton in every tile while loading", () => {
    render(<KpiTiles summary={undefined} />);

    expect(screen.getAllByTestId("kpi-skeleton")).toHaveLength(4);
    expect(screen.queryAllByTestId("kpi-value")).toHaveLength(0);
    expect(screen.getAllByText("Loading…")).toHaveLength(4);
  });

  it("offers a retry when the summary can't load", () => {
    const retry = vi.fn();
    render(<KpiTiles summary={undefined} isError onRetry={retry} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn’t load today’s figures",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
