import type {
  ChargeBasis,
  ChargeType,
} from "@/lib/charges/calculate-transaction";
import type { RateUnit } from "@/features/purchases/types";
import type { PaperSize, ParchiKind, ParchiLanguage } from "./types";

/**
 * Every user-facing string of the parchi. The panel controls around it are
 * English (the screens are English for now); the printed parchi itself is
 * handed to the trader, so it has English and Urdu words (`parchiWords`).
 */

export const parchiText = {
  paperLabel: "Paper",
  languageLabel: "Parchi language",
  print: "Print parchi",
  preparing: "Preparing…",
  reprint: "Reprint",
  failed: "Couldn’t print the parchi. Please try again.",
  preview: (billNo: string) => `Parchi ${billNo}`,
  previewHint: "This is how the parchi prints.",
} as const;

/** Paper names in the picker. */
export const paperText = {
  a4: "A4",
  a5: "A5",
  thermal80: "80 mm thermal",
} as const satisfies Record<PaperSize, string>;

/** The language picker shows each language in its own script. */
export const parchiLanguageNames = {
  en: "English",
  ur: "اردو",
} as const satisfies Record<ParchiLanguage, string>;

export interface ParchiWords {
  title: Record<ParchiKind, string>;
  party: Record<ParchiKind, string>;
  billNo: string;
  date: string;
  phone: string;
  columns: {
    no: string;
    commodity: string;
    bags: string;
    weight: string;
    rate: string;
    amount: string;
  };
  perUnit: Record<RateUnit, string>;
  /** Short weight units: "12 mn 15 kg" / "12 من 15 کلو". */
  maund: string;
  kg: string;
  gross: string;
  charges: Record<ChargeType, string>;
  /** "Commission 2%", "Labour Rs 20.00 per bag", "Other Rs 150.00". */
  charge: (type: ChargeType, basis: ChargeBasis, value: string) => string;
  totalCharges: Record<ParchiKind, string>;
  rounding: string;
  net: Record<ParchiKind, string>;
  settled: Record<ParchiKind, string>;
  notes: string;
  itemCount: (n: number) => string;
  printedOn: string;
  cancelled: string;
  cancelledNote: string;
  page: string;
  of: string;
}

function chargeLabel(
  name: string,
  basis: ChargeBasis,
  value: string,
  perBag: string,
): string {
  if (basis === "percent") return `${name} ${value}%`;
  if (basis === "per_bag") return `${name} ${value} ${perBag}`;
  return `${name} ${value}`;
}

const enCharges: Record<ChargeType, string> = {
  commission: "Commission",
  market_fee: "Market fee",
  labour: "Labour",
  other: "Other",
};

const urCharges: Record<ChargeType, string> = {
  commission: "کمیشن",
  market_fee: "مارکیٹ فیس",
  labour: "مزدوری",
  other: "دیگر",
};

const en: ParchiWords = {
  title: { purchase: "Purchase parchi", sale: "Sale parchi" },
  party: { purchase: "Kissan", sale: "Beopari" },
  billNo: "Bill no",
  date: "Date",
  phone: "Phone",
  columns: {
    no: "#",
    commodity: "Commodity",
    bags: "Bags",
    weight: "Weight",
    rate: "Rate",
    amount: "Amount",
  },
  perUnit: { maund: "per maund", kg: "per kg", bag: "per bag" },
  maund: "mn",
  kg: "kg",
  gross: "Gross amount",
  charges: enCharges,
  charge: (type, basis, value) =>
    chargeLabel(enCharges[type], basis, value, "per bag"),
  totalCharges: { purchase: "Total deductions", sale: "Total charges" },
  rounding: "Rounding",
  net: { purchase: "Net payable to kissan", sale: "Net receivable" },
  settled: { purchase: "Paid now", sale: "Received now" },
  notes: "Notes",
  itemCount: (n) => (n === 1 ? "1 item" : `${n} items`),
  printedOn: "Printed on",
  cancelled: "CANCELLED",
  cancelledNote: "This bill is cancelled and is not payable.",
  page: "Page",
  of: "of",
};

const ur: ParchiWords = {
  title: { purchase: "خرید کی پرچی", sale: "فروخت کی پرچی" },
  party: { purchase: "کسان", sale: "بیوپاری" },
  billNo: "بل نمبر",
  date: "تاریخ",
  phone: "فون",
  columns: {
    no: "نمبر",
    commodity: "جنس",
    bags: "بوری",
    weight: "وزن",
    rate: "ریٹ",
    amount: "رقم",
  },
  perUnit: { maund: "فی من", kg: "فی کلو", bag: "فی بوری" },
  maund: "من",
  kg: "کلو",
  gross: "کل رقم",
  charges: urCharges,
  charge: (type, basis, value) =>
    chargeLabel(urCharges[type], basis, value, "فی بوری"),
  totalCharges: { purchase: "کل کٹوتی", sale: "کل اخراجات" },
  rounding: "راؤنڈنگ",
  net: { purchase: "کسان کو قابلِ ادائیگی", sale: "قابلِ وصولی" },
  settled: { purchase: "ادا شدہ", sale: "وصول شدہ" },
  notes: "نوٹ",
  itemCount: (n) => `${n} اشیاء`,
  printedOn: "پرنٹ کی تاریخ",
  cancelled: "منسوخ",
  cancelledNote: "یہ بل منسوخ ہے اور قابلِ ادائیگی نہیں۔",
  page: "صفحہ",
  of: "از",
};

/** Words printed on the parchi, in English and Urdu. */
export const parchiWords: Record<ParchiLanguage, ParchiWords> = { en, ur };
