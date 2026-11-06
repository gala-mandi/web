import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BalanceAmount, SideAmount } from "./balance-amount";

describe("BalanceAmount", () => {
  it("a positive balance is receivable: Dr, green, 'They owe you'", () => {
    const { container } = render(<BalanceAmount balance="50000.00" showHint />);
    const root = container.firstElementChild!;
    expect(root).toHaveTextContent("Rs 50,000.00 Dr");
    expect(root).toHaveTextContent("They owe you");
    expect(root).toHaveAttribute("data-kind", "receivable");
    expect(root).toHaveClass("text-success");
    expect(screen.getByTitle("Receivable")).toHaveTextContent("Dr");
  });

  it("a negative balance is payable: Cr, red, no minus sign", () => {
    const { container } = render(
      <BalanceAmount balance="-60000.50" showHint />,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveTextContent("Rs 60,000.50 Cr");
    expect(root).toHaveTextContent("You owe them");
    expect(root).not.toHaveTextContent("-");
    expect(root).toHaveAttribute("data-kind", "payable");
    expect(root).toHaveClass("text-destructive");
    expect(screen.getByTitle("Payable")).toHaveTextContent("Cr");
  });

  it("zero is settled, without Dr or Cr", () => {
    const { container } = render(<BalanceAmount balance="0.00" showHint />);
    const root = container.firstElementChild!;
    expect(root).toHaveTextContent("Rs 0.00");
    expect(root).toHaveTextContent("Nothing owed");
    expect(root).not.toHaveTextContent(/Dr|Cr/);
    expect(root).toHaveClass("text-muted-foreground");
  });

  it("leaves the hint out unless asked", () => {
    const { container } = render(<BalanceAmount balance="-1.00" />);
    expect(container).toHaveTextContent(/^Rs 1\.00 Cr$/);
  });

  it("keeps big amounts exact (no float rounding)", () => {
    const { container } = render(<BalanceAmount balance="-999999999999.99" />);
    expect(container).toHaveTextContent("Rs 999,999,999,999.99 Cr");
  });
});

describe("SideAmount", () => {
  it("shows a debit in the receivable colour and a credit in the payable one", () => {
    const { rerender, container } = render(
      <SideAmount amount="20000.00" side="debit" />,
    );
    expect(container.firstElementChild).toHaveTextContent("Rs 20,000.00");
    expect(container.firstElementChild).toHaveClass("text-success");
    rerender(<SideAmount amount="100000.00" side="credit" />);
    expect(container.firstElementChild).toHaveClass("text-destructive");
  });

  it("shows nothing for the empty side of a line", () => {
    const { container } = render(<SideAmount amount="0.00" side="debit" />);
    expect(container).toBeEmptyDOMElement();
  });
});
