import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  cancelledSaleBill,
  longPurchaseBill,
  PRINTED_AT,
  purchaseBill,
  saleBill,
  shop,
} from "../test-data";
import type { PaperSize, ParchiBill, ParchiLanguage } from "../types";
import { ParchiDocument } from "./parchi-document";

function renderParchi(
  bill: ParchiBill,
  paper: PaperSize,
  lang: ParchiLanguage,
  shopOverrides: Partial<typeof shop> = {},
) {
  const { container } = render(
    <ParchiDocument
      bill={bill}
      shop={{ ...shop, ...shopOverrides }}
      lang={lang}
      paper={paper}
      printedAt={PRINTED_AT}
    />,
  );
  return container.firstElementChild as HTMLElement;
}

describe("ParchiDocument snapshots", () => {
  const cases: [string, ParchiBill, PaperSize, ParchiLanguage][] = [
    ["purchase, A4, English", purchaseBill, "a4", "en"],
    ["purchase, A4, Urdu", purchaseBill, "a4", "ur"],
    ["sale, A5, English", saleBill, "a5", "en"],
    ["sale, A5, Urdu", saleBill, "a5", "ur"],
    ["purchase, 80 mm, English", purchaseBill, "thermal80", "en"],
    ["sale, 80 mm, Urdu", saleBill, "thermal80", "ur"],
    ["cancelled sale, A4, English", cancelledSaleBill, "a4", "en"],
    ["cancelled sale, 80 mm, Urdu", cancelledSaleBill, "thermal80", "ur"],
  ];

  it.each(cases)("%s", (_name, bill, paper, lang) => {
    expect(renderParchi(bill, paper, lang)).toMatchSnapshot();
  });
});

describe("ParchiDocument", () => {
  it("prints the header, bill no, date, kissan, items, charges, net and footer", () => {
    const parchi = renderParchi(purchaseBill, "a4", "en");
    expect(parchi).toHaveAccessibleName(
      `Purchase parchi ${purchaseBill.billNo}`,
    );
    expect(screen.getByTestId("parchi-shop")).toHaveTextContent(shop.name);
    expect(parchi).toHaveTextContent("Shop 12, New Grain Market, Okara");
    expect(parchi).toHaveTextContent("Phone: 0300-1234567");
    expect(screen.getByTestId("parchi-logo")).toHaveAttribute(
      "src",
      shop.logoUrl,
    );
    expect(parchi).toHaveTextContent("Bill noPUR-2026-27-000001");
    expect(parchi).toHaveTextContent("Date6 Nov 2026");
    expect(parchi).toHaveTextContent("KissanRafiq Ahmad");

    const rows = within(parchi).getAllByRole("row");
    expect(rows).toHaveLength(3); // headings + 2 items
    expect(rows[1]).toHaveTextContent(
      "1Gandum1025 mn 10 kg1,010 kgRs 4,000.00per maundRs 101,000.00",
    );
    expect(rows[2]).toHaveTextContent("15 mn 15.5 kg615.5 kg");

    const sums = within(screen.getByTestId("parchi-sums"));
    expect(sums.getByText("Gross amount").nextSibling).toHaveTextContent(
      "Rs 196,402.50",
    );
    expect(sums.getByText("Commission 2%").nextSibling).toHaveTextContent(
      "-Rs 2,020.00",
    );
    expect(
      sums.getByText("Labour Rs 20.00 per bag").nextSibling,
    ).toHaveTextContent("-Rs 200.00");
    // Chana's 0% market fee came to Rs 0: left off the paper.
    expect(sums.queryByText("Market fee 0%")).toBeNull();
    expect(sums.getByText("Total deductions").nextSibling).toHaveTextContent(
      "-Rs 5,200.06",
    );
    expect(sums.getByText("Rounding").nextSibling).toHaveTextContent(
      "-Rs 0.44",
    );
    expect(screen.getByTestId("parchi-net")).toHaveTextContent("Rs 191,202.00");
    expect(sums.getByText("Paid now").nextSibling).toHaveTextContent(
      "Rs 20,000.00",
    );
    expect(parchi).toHaveTextContent("NotesTruck LES-4521");
    // An English and an Urdu footer line: each its own line, the Urdu one
    // in Nastaliq with room for its tall letters.
    const [english, urdu] = Array.from(
      screen.getByTestId("parchi-footer").children,
    );
    expect(english).toHaveTextContent("Thank you for your business.");
    expect(english).toHaveClass("block", "[line-height:1.5]");
    expect(urdu).toHaveTextContent("شکریہ — براہِ کرم پرچی چیک کر لیں۔");
    expect(urdu).toHaveClass("block", "font-urdu-mixed", "[line-height:2.5]");
    expect(urdu).toHaveAttribute("dir", "auto");
    expect(parchi).toHaveTextContent("Printed on: 6 Nov 2026, 10:30 am");
    expect(screen.queryByTestId("parchi-watermark")).toBeNull();
  });

  it("adds the sale's charges for the beopari", () => {
    const parchi = renderParchi(saleBill, "a5", "en");
    expect(parchi).toHaveAccessibleName(`Sale parchi ${saleBill.billNo}`);
    expect(parchi).toHaveTextContent("BeopariShahid Traders");
    const sums = within(screen.getByTestId("parchi-sums"));
    expect(sums.getByText("Commission 2%").nextSibling).toHaveTextContent(
      "+Rs 2,020.00",
    );
    expect(sums.getByText("Total charges").nextSibling).toHaveTextContent(
      "+Rs 5,200.06",
    );
    expect(sums.getByText("Net receivable").nextSibling).toHaveTextContent(
      "Rs 201,603.00",
    );
    expect(sums.getByText("Received now").nextSibling).toHaveTextContent(
      "Rs 50,000.00",
    );
  });

  it("prints Urdu right to left with amounts, bill no and phone left to right", () => {
    const parchi = renderParchi(purchaseBill, "a4", "ur");
    expect(parchi).toHaveAttribute("dir", "rtl");
    expect(parchi).toHaveAttribute("lang", "ur");
    expect(parchi).toHaveAccessibleName(`خرید کی پرچی ${purchaseBill.billNo}`);
    expect(parchi).toHaveTextContent("کسانRafiq Ahmad");
    expect(parchi).toHaveTextContent("6 نومبر، 2026");
    expect(within(parchi).getByText(purchaseBill.billNo)).toHaveAttribute(
      "dir",
      "ltr",
    );
    expect(within(parchi).getByText("0300-1234567")).toHaveAttribute(
      "dir",
      "ltr",
    );
    expect(within(parchi).getByText("Rs 101,000.00")).toHaveAttribute(
      "dir",
      "ltr",
    );
    expect(parchi).toHaveTextContent("25 من 10 کلو");
    expect(parchi).toHaveTextContent("فی من");
    // The rate is isolated left to right: "2%", not "%2".
    expect(within(parchi).getByText("کمیشن ⁦2%⁩")).toBeVisible();
    expect(screen.getByTestId("parchi-net").previousSibling).toHaveTextContent(
      "کسان کو قابلِ ادائیگی",
    );
  });

  it("stamps a cancelled bill and lays a CANCELLED watermark over it", () => {
    renderParchi(cancelledSaleBill, "a4", "en");
    expect(screen.getByTestId("parchi-cancelled")).toHaveTextContent(
      "CANCELLED",
    );
    const watermark = screen.getByTestId("parchi-watermark");
    expect(watermark).toHaveTextContent("CANCELLED");
    expect(watermark).toHaveAttribute("aria-hidden", "true");
    // Fixed when printing: on every sheet.
    expect(watermark).toHaveClass("print:fixed");
  });

  it("stamps a cancelled Urdu bill منسوخ", () => {
    renderParchi(cancelledSaleBill, "thermal80", "ur");
    expect(screen.getByTestId("parchi-watermark")).toHaveTextContent("منسوخ");
    expect(screen.getByTestId("parchi-cancelled")).toHaveTextContent("منسوخ");
  });

  it("80 mm: every item stacked on two lines, nothing in a wide table", () => {
    const parchi = renderParchi(purchaseBill, "thermal80", "en");
    expect(parchi).toHaveAttribute("data-parchi", "thermal80");
    expect(parchi).toHaveClass("w-[80mm]", "px-[4mm]");
    expect(within(parchi).queryByRole("table")).toBeNull();
    const items = within(parchi).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(
      "1. Gandum10 Bags25 mn 10 kg (1,010 kg) · Rs 4,000.00 per maundRs 101,000.00",
    );
  });

  it("a long kissan name and many items print whole, the table headings repeat", () => {
    const parchi = renderParchi(longPurchaseBill, "a5", "en");
    expect(parchi).toHaveTextContent(longPurchaseBill.partyName);
    const table = within(parchi).getByRole("table");
    expect(table).toHaveClass("table-fixed");
    expect(within(table).getAllByRole("row")).toHaveLength(31);
    expect(parchi.querySelector("thead")).not.toBeNull();
    const roll = renderParchi(longPurchaseBill, "thermal80", "ur");
    expect(within(roll).getAllByRole("listitem")).toHaveLength(30);
  });

  it("an Urdu name typed by the shop gets Nastaliq room on the English parchi", () => {
    renderParchi({ ...purchaseBill, partyName: "رفیق احمد" }, "a4", "en", {
      name: "المدینہ کمیشن شاپ",
    });
    expect(screen.getByText("رفیق احمد")).toHaveClass(
      "font-urdu-mixed",
      "[line-height:2.5]",
    );
    expect(screen.getByText("المدینہ کمیشن شاپ")).toHaveClass(
      "font-urdu-mixed",
    );
    expect(screen.getByText("Gandum")).not.toHaveClass("font-urdu-mixed");
  });

  it("leaves out what the shop hasn't set, and a logo that fails to load", () => {
    const parchi = renderParchi(purchaseBill, "a4", "en", {
      address: null,
      phone: null,
      footer: null,
    });
    expect(parchi).not.toHaveTextContent("Phone");
    expect(screen.queryByTestId("parchi-footer")).toBeNull();
    fireEvent.error(screen.getByTestId("parchi-logo"));
    expect(screen.queryByTestId("parchi-logo")).toBeNull();
    expect(screen.getByTestId("parchi-shop")).toHaveTextContent(shop.name);
  });
});
