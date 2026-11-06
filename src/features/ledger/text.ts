import type { TraderType } from "@/features/traders/types";
import type { BalanceKind } from "@/features/traders/balance";
import type { SourceType } from "./types";

/**
 * Every user-facing string of the Ledger pages (khata and balances). The
 * screens are English for now (Urdu RTL is a later ticket); the printed,
 * PDF and Excel statement has its own English and Urdu words below
 * (`statementText`) because it is handed to the trader.
 */

export const sourceTypeText = {
  opening: "Opening balance",
  purchase: "Purchase",
  sale: "Sale",
  payment: "Payment",
  receipt: "Receipt",
  adjustment: "Adjustment",
  reversal: "Reversal",
} as const satisfies Record<SourceType, string>;

export const ledgerText = {
  /** Short side labels next to every amount; the colour is never the only cue. */
  dr: "Dr",
  cr: "Cr",
  balance: {
    receivable: "Receivable",
    payable: "Payable",
    settled: "Settled",
    /** Under a balance: who owes whom, in plain words. */
    receivableHint: "They owe you",
    payableHint: "You owe them",
    settledHint: "Nothing owed",
  } satisfies Record<BalanceKind | `${BalanceKind}Hint`, string>,
  legend: {
    label: "How to read the khata",
    dr: "(debit): the trader owes you more — a sale to them, or money you paid them.",
    cr: "(credit): you owe the trader more — a purchase from them, or money they paid you.",
  },
  khata: {
    traderLabel: "Trader",
    traderPlaceholder: "Pick a trader…",
    dateLabel: "Dates",
    balancesLink: "All balances",
    pick: {
      title: "Pick a trader",
      body: "Choose a kissan or beopari to see their khata: every purchase, sale, payment and adjustment with the running balance.",
    },
    openingBalance: "Opening balance",
    openingOn: (day: string) => `Before ${day}`,
    openingAll: "Before the first entry",
    closingBalance: "Closing balance",
    closingOn: (day: string) => `At the end of ${day}`,
    closingNow: "Up to today",
    entriesTitle: "Entries",
    caption: (name: string) => `Khata of ${name}`,
    columns: {
      date: "Date",
      details: "Details",
      debit: "Dr (debit)",
      credit: "Cr (credit)",
      balance: "Balance",
    },
    openSource: (label: string) => `Open ${label}`,
    adjustmentNote: "Adjustment by the owner",
    empty: {
      title: "No entries in these dates",
      body: "Nothing was written to this khata in the chosen dates. The opening and closing balance are shown above.",
      bodyAll: "Nothing has been written to this khata yet.",
      clear: "Show all dates",
    },
    notFound: {
      title: "Trader not found",
      body: "This trader isn’t in your shop. Pick another trader.",
    },
    error: {
      title: "Couldn’t load the khata",
      body: "Check your internet and try again.",
      retry: "Try again",
    },
  },
  statement: {
    languageLabel: "Statement language",
    print: "Print",
    excel: "Excel",
    pdf: "PDF",
    preparing: "Preparing…",
    pdfHint: "In the print window, choose “Save as PDF”.",
    failed: "Couldn’t prepare the statement. Please try again.",
  },
  balances: {
    title: "Balances",
    description:
      "Every trader with what they owe you (receivable) and what you owe them (payable).",
    khataLink: "Open a khata",
    searchLabel: "Search traders",
    searchPlaceholder: "Name or phone",
    typeLabel: "Type",
    typeAll: "All traders",
    sortLabel: "Sort by",
    sorts: {
      "-balance": "Largest receivable first",
      balance: "Largest payable first",
      name: "Name (A–Z)",
      "-name": "Name (Z–A)",
    },
    totalReceivable: "Total receivable",
    totalReceivableHint: "Traders owe you",
    totalPayable: "Total payable",
    totalPayableHint: "You owe traders",
    caption: "Trader balances",
    columns: {
      name: "Trader",
      type: "Type",
      phone: "Phone",
      receivable: "Receivable (Dr)",
      payable: "Payable (Cr)",
    },
    empty: {
      title: "No traders yet",
      body: "Add traders, then their purchases and sales show up here.",
    },
    noMatches: {
      title: "No traders match",
      body: "Try another name or phone number, or clear the filters.",
      clear: "Clear filters",
    },
  },
} as const;

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
    sources: sourceTypeText,
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
