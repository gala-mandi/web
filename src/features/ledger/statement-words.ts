import type { TraderType } from "@/features/traders/types";
import type { SourceType } from "./types";

/**
 * Words of the printed / PDF / Excel khata statement, in English and Urdu.
 * The statement is handed to the trader, so it can print in either
 * language whatever the screen shows (it starts in the interface language);
 * both dictionaries stay here because the browser only loads the messages
 * of the interface language.
 */

export type StatementLanguage = "en" | "ur";
export const statementLanguages = ["en", "ur"] as const;

/** The language picker shows each language in its own script. */
export const statementLanguageNames = {
  en: "English",
  ur: "اردو",
} as const satisfies Record<StatementLanguage, string>;

interface StatementWords {
  title: string;
  shop: string;
  trader: string;
  traderTypes: Record<TraderType, string>;
  period: string;
  allDates: string;
  from: (day: string) => string;
  to: (day: string) => string;
  range: (from: string, to: string) => string;
  printedOn: string;
  columns: {
    date: string;
    details: string;
    debit: string;
    credit: string;
    balance: string;
  };
  sources: Record<SourceType, string>;
  openingBalance: string;
  closingBalance: string;
  dr: string;
  cr: string;
  noEntries: string;
  legend: string;
  page: string;
  of: string;
  sheetName: string;
  fileName: string;
}

/** Words of the printed / PDF / Excel statement, in English and Urdu. */
export const statementText: Record<StatementLanguage, StatementWords> = {
  en: {
    title: "Khata statement",
    shop: "Shop",
    trader: "Trader",
    traderTypes: { kissan: "Kissan", beopari: "Beopari", arhti: "Arhti" },
    period: "Period",
    allDates: "All dates",
    from: (day) => `From ${day}`,
    to: (day) => `Up to ${day}`,
    range: (from, to) => `${from} to ${to}`,
    printedOn: "Printed on",
    columns: {
      date: "Date",
      details: "Details",
      debit: "Dr (debit)",
      credit: "Cr (credit)",
      balance: "Balance",
    },
    sources: {
      opening: "Opening balance",
      purchase: "Purchase",
      sale: "Sale",
      payment: "Payment",
      receipt: "Receipt",
      adjustment: "Adjustment",
      reversal: "Reversal",
    },
    openingBalance: "Opening balance",
    closingBalance: "Closing balance",
    dr: "Dr",
    cr: "Cr",
    noEntries: "No entries in this period.",
    legend:
      "Dr = the trader owes the shop · Cr = the shop owes the trader. The balance after each line is shown on the right.",
    page: "Page",
    of: "of",
    sheetName: "Khata",
    fileName: "khata",
  },
  ur: {
    title: "کھاتہ اسٹیٹمنٹ",
    shop: "دکان",
    trader: "نام",
    traderTypes: { kissan: "کسان", beopari: "بیوپاری", arhti: "آڑھتی" },
    period: "مدت",
    allDates: "تمام تاریخیں",
    from: (day) => `${day} سے`,
    to: (day) => `${day} تک`,
    range: (from, to) => `${from} سے ${to} تک`,
    printedOn: "پرنٹ کی تاریخ",
    columns: {
      date: "تاریخ",
      details: "تفصیل",
      debit: "بنام",
      credit: "جمع",
      balance: "بقایا",
    },
    sources: {
      opening: "سابقہ بقایا",
      purchase: "خرید",
      sale: "فروخت",
      payment: "ادائیگی",
      receipt: "وصولی",
      adjustment: "ایڈجسٹمنٹ",
      reversal: "منسوخی",
    },
    openingBalance: "سابقہ بقایا",
    closingBalance: "موجودہ بقایا",
    dr: "بنام",
    cr: "جمع",
    noEntries: "اس مدت میں کوئی اندراج نہیں۔",
    legend:
      "بنام = بیوپاری/کسان نے دکان کو دینا ہے · جمع = دکان نے بیوپاری/کسان کو دینا ہے۔",
    page: "صفحہ",
    of: "از",
    sheetName: "کھاتہ",
    fileName: "khata",
  },
};
