import { rateText } from "@/features/purchases/components/breakdown-lines";
import type { Purchase } from "@/features/purchases/types";
import { statementDay } from "@/features/ledger/statement";
import type { Sale } from "@/features/sales/types";
import type { ChargeLine } from "@/lib/charges/calculate-transaction";
import {
  formatDateTime,
  formatKg,
  formatMaund,
  formatRs,
  SHOP_TIME_ZONE,
} from "@/lib/format";
import { parchiWords } from "./text";
import type {
  PaperSize,
  ParchiBill,
  ParchiKind,
  ParchiLanguage,
} from "./types";

/**
 * Pure helpers of the printed parchi: the bill in one shape for purchases
 * and sales, words and numbers in the parchi's language, and the `@page`
 * rules of each paper. Amounts are the server's strings, only formatted.
 */

/** `GET /purchases/:id` as the parchi prints it. */
export function purchaseParchi(purchase: Purchase): ParchiBill {
  return {
    kind: "purchase",
    billNo: purchase.billNo,
    date: purchase.purchaseDate,
    status: purchase.status,
    partyName: purchase.trader.name,
    items: purchase.items,
    grossAmount: purchase.grossAmount,
    charges: purchase.charges,
    totalCharges: purchase.totalDeductions,
    rounding: purchase.rounding,
    netAmount: purchase.netAmount,
    settledAmount: purchase.paidAmount,
    notes: purchase.notes,
  };
}

/** `GET /sales/:id` as the parchi prints it. */
export function saleParchi(sale: Sale): ParchiBill {
  return {
    kind: "sale",
    billNo: sale.billNo,
    date: sale.saleDate,
    status: sale.status,
    partyName: sale.buyer.name,
    items: sale.items,
    grossAmount: sale.grossAmount,
    charges: sale.charges,
    totalCharges: sale.totalCharges,
    rounding: sale.rounding,
    netAmount: sale.netAmount,
    settledAmount: sale.receivedAmount,
    notes: sale.notes,
  };
}

/** A `YYYY-MM-DD` day: `6 Nov 2026` / `6 نومبر، 2026` (Western digits). */
export function parchiDay(value: string | Date, lang: ParchiLanguage): string {
  return statementDay(value, lang);
}

const urduDateTime = new Intl.DateTimeFormat("ur-PK", {
  timeZone: SHOP_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** When the parchi was printed, in Asia/Karachi time. */
export function parchiDateTime(value: Date, lang: ParchiLanguage): string {
  return lang === "en" ? formatDateTime(value) : urduDateTime.format(value);
}

/** A rupee amount; Urdu keeps the same `Rs 1,234.00`, read left to right. */
export const parchiRs = formatRs;

/** "-0.46" → "-Rs 0.46", "0.50" → "+Rs 0.50", "0.00" → "Rs 0.00". */
export function parchiSignedRs(value: string): string {
  const shown = formatRs(value);
  return value.startsWith("-") || !/[1-9]/.test(value) ? shown : `+${shown}`;
}

/** True when an amount is above zero ("0.00" → false). */
export function isNonZero(value: string | null | undefined): boolean {
  return /[1-9]/.test(value ?? "");
}

/**
 * A weight as maund + kg and as kg, in the parchi's words:
 * `{ maund: "25 mn 10 kg", kg: "1,010 kg" }` / `{ maund: "25 من 10 کلو", … }`.
 */
export function parchiWeight(
  weightKg: string,
  maundKg: string,
  lang: ParchiLanguage,
): { maund: string; kg: string } {
  const maund = formatMaund(weightKg, maundKg);
  const kg = formatKg(weightKg);
  if (lang === "en") return { maund, kg };
  const w = parchiWords[lang];
  const local = (text: string) =>
    text.replace(/\bmn\b/g, w.maund).replace(/\bkg\b/g, w.kg);
  return { maund: local(maund), kg: local(kg) };
}

/** "Commission 2%", "Labour Rs 20.00 per bag" in the parchi's language. */
export function parchiChargeLabel(
  charge: Pick<ChargeLine, "type" | "basis" | "value">,
  lang: ParchiLanguage,
): string {
  const value =
    charge.basis === "percent"
      ? rateText(charge.value)
      : formatRs(charge.value);
  return parchiWords[lang].charge(charge.type, charge.basis, value);
}

/**
 * The sign of a charge line: deducted from the kissan's amount on a
 * purchase, added to the beopari's on a sale.
 */
export function chargeSign(kind: ParchiKind): "-" | "+" {
  return kind === "purchase" ? "-" : "+";
}

/** File name the print window suggests for "Save as PDF". */
export function parchiDocumentTitle(billNo: string): string {
  return `parchi-${billNo}`;
}

/** Sheet margins (mm); the thermal roll has none, the parchi pads itself. */
const pageRules: Record<PaperSize, string> = {
  a4: "size: A4 portrait; margin: 12mm 12mm 16mm;",
  a5: "size: A5 portrait; margin: 9mm 9mm 13mm;",
  // The height is set to the printed parchi's own (`thermalPageRule`).
  thermal80: "size: 80mm 297mm; margin: 0;",
};

/**
 * `@page` and print rules of one paper. A4 and A5 number their sheets;
 * the item table's headings repeat on each sheet and a row, the sums and
 * the footer are never split. The thermal roll prints as one long page.
 */
export function parchiPageStyle(
  paper: PaperSize,
  lang: ParchiLanguage,
): string {
  const w = parchiWords[lang];
  const pageNumber =
    paper === "thermal80"
      ? ""
      : `
  @bottom-center {
    content: "${w.page} " counter(page) " ${w.of} " counter(pages);
    font-size: 8pt;
    color: #4a4656;
  }`;
  return `
@page {
  ${pageRules[paper]}${pageNumber}
}
@media print {
  html, body { background: #fff; margin: 0; padding: 0; }
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  thead { display: table-header-group; }
  tr, [data-parchi-keep] { break-inside: avoid; page-break-inside: avoid; }
}`;
}

/** 96 CSS px = 1 inch = 25.4 mm. */
const MM_PER_PX = 25.4 / 96;

/**
 * The thermal roll's page, as long as the parchi itself (plus a little
 * paper to tear off), so nothing is cut and no blank paper is fed.
 */
export function thermalPageRule(heightPx: number): string {
  const mm = Math.ceil(heightPx * MM_PER_PX) + 6;
  return `@page { size: 80mm ${Math.max(mm, 60)}mm; margin: 0; }`;
}
