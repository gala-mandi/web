import type {
  ChargeBasis,
  ChargeType,
} from "@/lib/charges/calculate-transaction";
import type { RateUnit } from "@/features/purchases/types";
import type { ParchiKind, ParchiLanguage } from "./types";

/**
 * Words printed on the parchi, in English and Urdu. The parchi is handed to
 * the trader and prints in the interface language unless the picker on the
 * parchi screen says otherwise, so both dictionaries stay here (the browser
 * only loads the messages of the interface language). The screen controls
 * around it are in the `parchi` messages.
 */

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
  rtl = false,
): string {
  const amount = `${value}${basis === "percent" ? "%" : ""}`;
  // In Urdu a percentage is isolated left to right: "2%", not "%2"; a
  // rupee amount ("20.00 روپے") keeps its own right-to-left order.
  const shown = rtl && basis === "percent" ? `\u2066${amount}\u2069` : amount;
  if (basis === "per_bag") return `${name} ${shown} ${perBag}`;
  return `${name} ${shown}`;
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
    chargeLabel(urCharges[type], basis, value, "فی بوری", true),
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
