import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PRINTED_AT, shop } from "@/features/parchi/test-data";
import type { PaperSize, ParchiLanguage } from "@/features/parchi/types";
import { savedPayment } from "../test-data";
import type { Payment } from "../types";
import { VoucherDocument } from "./voucher-document";

function renderVoucher(
  payment: Payment,
  paper: PaperSize = "a4",
  lang: ParchiLanguage = "en",
) {
  const { container } = render(
    <VoucherDocument
      payment={payment}
      shop={shop}
      lang={lang}
      paper={paper}
      printedAt={PRINTED_AT}
    />,
  );
  return container.firstElementChild as HTMLElement;
}

describe("VoucherDocument", () => {
  it("prints the shop, voucher no, date, kissan, amount, method, bills and signatures on A4", () => {
    const voucher = renderVoucher(savedPayment({ reference: "Chq 004512" }));
    expect(voucher).toHaveAccessibleName("Payment voucher PAY-2026-27-000001");
    expect(voucher).toHaveAttribute("data-parchi", "a4");
    expect(screen.getByTestId("parchi-shop")).toHaveTextContent(shop.name);
    expect(voucher).toHaveTextContent("Voucher noPAY-2026-27-000001");
    expect(voucher).toHaveTextContent("Date6 Nov 2026");
    expect(voucher).toHaveTextContent("Paid to · KissanRafiq Ahmad");
    expect(screen.getByTestId("voucher-amount")).toHaveTextContent(
      "Rs 100,000.00",
    );
    expect(voucher).toHaveTextContent("ByCash");
    expect(voucher).toHaveTextContent("ReferenceChq 004512");

    const rows = within(screen.getByTestId("voucher-bills")).getAllByRole(
      "row",
    );
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent(
      "1PUR-2026-27-0000011 Nov 2026Rs 30,000.00",
    );
    expect(rows[3]).toHaveTextContent("Rs 20,000.00");

    const sums = screen.getByTestId("voucher-sums");
    expect(sums).toHaveTextContent("Settled on billsRs 100,000.00");
    expect(sums).toHaveTextContent("Advance (peshgi)Rs 0.00");
    expect(voucher).toHaveTextContent("Received by (kissan)");
    expect(voucher).toHaveTextContent("For the shop");
    expect(voucher).toHaveTextContent("Printed on");
    expect(screen.queryByTestId("parchi-watermark")).toBeNull();
  });

  it("a receipt with no bill is all advance, on the 80 mm roll", () => {
    const voucher = renderVoucher(
      savedPayment({
        direction: "received",
        voucherNo: "RCT-2026-27-000001",
        method: "bank",
        allocated: "0.00",
        advance: "25000.00",
        amount: "25000.00",
        allocations: [],
      }),
      "thermal80",
    );
    expect(voucher).toHaveAccessibleName("Receipt voucher RCT-2026-27-000001");
    expect(voucher).toHaveAttribute("data-parchi", "thermal80");
    expect(voucher).toHaveTextContent("Received fromRafiq Ahmad");
    expect(voucher).toHaveTextContent("ByBank");
    expect(voucher).toHaveTextContent(
      "No bill: the whole amount is an advance.",
    );
    expect(screen.getByTestId("voucher-sums")).toHaveTextContent(
      "Advance (peshgi)Rs 25,000.00",
    );
    expect(voucher).toHaveTextContent("Paid by (beopari)");
  });

  it("prints in Urdu right to left, amounts and numbers left to right", () => {
    const voucher = renderVoucher(savedPayment(), "a5", "ur");
    expect(voucher).toHaveAttribute("dir", "rtl");
    expect(voucher).toHaveAttribute("lang", "ur");
    expect(voucher).toHaveAccessibleName("ادائیگی واؤچر PAY-2026-27-000001");
    expect(voucher).toHaveTextContent("واؤچر نمبر");
    expect(voucher).toHaveTextContent("بذریعہنقد");
    const amount = screen.getByTestId("voucher-amount");
    expect(amount.querySelector("[dir=ltr]")).toHaveTextContent(
      "Rs 100,000.00",
    );
  });

  it("a cancelled voucher has the watermark and its bills struck through", () => {
    renderVoucher(savedPayment({ status: "cancelled" }));
    expect(screen.getByTestId("parchi-watermark")).toHaveTextContent(
      "CANCELLED",
    );
    expect(screen.getByTestId("voucher-bills")).toHaveClass("line-through");
    expect(
      screen.getByText("Cancelled: these bills are open again."),
    ).toBeInTheDocument();
  });
});
