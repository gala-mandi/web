import { describe, expect, it } from "vitest";
import { owner } from "@/test/fake-api";
import { shopSettings } from "@/features/settings/test-data";
import { shopFromSettings, shopFromTenant } from "./hooks";
import {
  parchiChargeLabel,
  parchiDateTime,
  parchiPageStyle,
  parchiSignedRs,
  parchiWeight,
  thermalPageRule,
} from "./parchi";
import { PRINTED_AT, purchaseBill, saleBill } from "./test-data";

describe("purchaseParchi / saleParchi", () => {
  it("puts a purchase and a sale in one shape, amounts as the server sent them", () => {
    expect(purchaseBill).toMatchObject({
      kind: "purchase",
      billNo: "PUR-2026-27-000001",
      date: "2026-11-06",
      partyName: "Rafiq Ahmad",
      grossAmount: "196402.50",
      totalCharges: "5200.06",
      rounding: "-0.44",
      netAmount: "191202.00",
      settledAmount: "20000.00",
    });
    expect(saleBill).toMatchObject({
      kind: "sale",
      partyName: "Shahid Traders",
      netAmount: "201603.00",
      settledAmount: "50000.00",
    });
  });
});

describe("parchiWeight", () => {
  it("shows maund + kg and kg, a number never parted from its unit", () => {
    expect(parchiWeight("1010.000", "40", "en")).toEqual({
      maund: "25 mn 10 kg",
      kg: "1,010 kg",
    });
    expect(parchiWeight("15.000", "40", "en").maund).toBe("15 kg");
  });

  it("uses Urdu units on the Urdu parchi and the shop's maund", () => {
    expect(parchiWeight("1010.000", "40", "ur")).toEqual({
      maund: "25 من 10 کلو",
      kg: "1,010 کلو",
    });
    expect(parchiWeight("1000.000", "37.324", "ur").maund).toBe(
      "26 من 29.576 کلو",
    );
  });
});

describe("charge labels and signs", () => {
  it("names each charge with its rate", () => {
    expect(
      parchiChargeLabel(
        { type: "commission", basis: "percent", value: "2.50" },
        "en",
      ),
    ).toBe("Commission 2.5%");
    expect(
      parchiChargeLabel(
        { type: "labour", basis: "per_bag", value: "20.00" },
        "en",
      ),
    ).toBe("Labour Rs 20.00 per bag");
    expect(
      parchiChargeLabel(
        { type: "other", basis: "fixed", value: "150.00" },
        "en",
      ),
    ).toBe("Other Rs 150.00");
    expect(
      parchiChargeLabel(
        { type: "market_fee", basis: "percent", value: "0.50" },
        "ur",
      ),
    ).toBe("مارکیٹ فیس ⁦0.5%⁩");
    expect(
      parchiChargeLabel(
        { type: "labour", basis: "per_bag", value: "20.00" },
        "ur",
      ),
    ).toBe("مزدوری 20.00 روپے فی بوری");
  });

  it("signs the rounding line", () => {
    expect(parchiSignedRs("-0.46", "en")).toBe("-Rs 0.46");
    expect(parchiSignedRs("0.50", "en")).toBe("+Rs 0.50");
    expect(parchiSignedRs("0.00", "en")).toBe("Rs 0.00");
  });
});

describe("parchiDateTime", () => {
  it("shows Karachi time in either language", () => {
    expect(parchiDateTime(PRINTED_AT, "en")).toBe("6 Nov 2026, 10:30 am");
    expect(parchiDateTime(PRINTED_AT, "ur")).toContain("6 نومبر، 2026");
  });
});

describe("page rules", () => {
  it("A4 and A5: paper size, margins, numbered sheets, bill no after the first", () => {
    const a4 = parchiPageStyle("a4", "en", "PUR-2026-27-000001");
    expect(a4).toContain("size: A4 portrait");
    expect(a4).toContain(
      'content: "Page " counter(page) " of " counter(pages)',
    );
    expect(a4).toContain("@top-right");
    expect(a4).toContain('content: "Bill no PUR-2026-27-000001"');
    expect(a4).toContain("@page :first");
    expect(a4).toContain("thead { display: table-header-group; }");
    expect(a4).toContain("break-inside: avoid");
    expect(parchiPageStyle("a5", "en", "X")).toContain("size: A5 portrait");
    const ur = parchiPageStyle("a4", "ur", "X");
    expect(ur).toContain(
      'content: "صفحہ " counter(page) " از " counter(pages)',
    );
    expect(ur).toContain("@top-left");
  });

  it("80 mm: no margins or page numbers; the page is as long as the parchi", () => {
    const roll = parchiPageStyle("thermal80", "en", "X");
    expect(roll).toContain("size: 80mm 297mm; margin: 0;");
    expect(roll).not.toContain("counter(page)");
    // 1,000 px = 264.6 mm, rounded up, plus 6 mm to tear off.
    expect(thermalPageRule(1000)).toBe(
      "@page { size: 80mm 271mm; margin: 0; }",
    );
    expect(thermalPageRule(10)).toBe("@page { size: 80mm 60mm; margin: 0; }");
  });

  it("a quote in the bill no can't break the CSS", () => {
    expect(parchiPageStyle("a4", "en", 'A"B')).toContain('"Bill no A B"');
  });
});

describe("parchi shop", () => {
  it("from the owner's Settings: parchi name, address with city, footer", () => {
    expect(
      shopFromSettings(
        shopSettings({
          displayName: "  Al-Madina  ",
          parchiFooter: " Thanks ",
          logoUrl: "http://x/logo.png",
          language: "ur",
        }),
      ),
    ).toEqual({
      name: "Al-Madina",
      logoUrl: "http://x/logo.png",
      address: "Shop 12, Grain Market, Okara",
      phone: "03000000002",
      footer: "Thanks",
      maundKg: "40.000",
      language: "ur",
    });
    expect(
      shopFromSettings(shopSettings({ city: null, address: " " })),
    ).toMatchObject({ name: "Demo Mandi", address: null, footer: null });
  });

  it("for staff without Settings: the shop name and logo from /auth/me", () => {
    expect(shopFromTenant(owner.tenant)).toEqual({
      name: "Demo Mandi",
      logoUrl: null,
      address: null,
      phone: null,
      footer: null,
      maundKg: "40",
      language: null,
    });
  });
});
