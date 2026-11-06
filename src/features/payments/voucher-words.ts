import type { ParchiLanguage } from "@/features/parchi/types";
import type { PaymentDirection, PaymentMethod } from "./types";

/**
 * Words printed on the payment / receipt voucher. It is handed to the
 * kissan or beopari, so like the parchi it prints in English or Urdu.
 */
export interface VoucherWords {
  title: Record<PaymentDirection, string>;
  /** "Paid to" / "Received from". */
  party: Record<PaymentDirection, string>;
  partyType: Record<PaymentDirection, string>;
  voucherNo: string;
  date: string;
  amount: string;
  method: string;
  methods: Record<PaymentMethod, string>;
  reference: string;
  bills: string;
  columns: { no: string; billNo: string; billDate: string; amount: string };
  noBills: string;
  allocated: string;
  advance: string;
  cancelledBills: string;
  notes: string;
  /** Signature lines. */
  signParty: Record<PaymentDirection, string>;
  signShop: string;
}

const en: VoucherWords = {
  title: { paid: "Payment voucher", received: "Receipt voucher" },
  party: { paid: "Paid to", received: "Received from" },
  partyType: { paid: "Kissan", received: "Beopari" },
  voucherNo: "Voucher no",
  date: "Date",
  amount: "Amount",
  method: "By",
  methods: { cash: "Cash", bank: "Bank", cheque: "Cheque", online: "Online" },
  reference: "Reference",
  bills: "Bills settled",
  columns: {
    no: "#",
    billNo: "Bill no",
    billDate: "Bill date",
    amount: "Amount",
  },
  noBills: "No bill: the whole amount is an advance.",
  allocated: "Settled on bills",
  advance: "Advance (peshgi)",
  cancelledBills: "Cancelled: these bills are open again.",
  notes: "Notes",
  signParty: { paid: "Received by (kissan)", received: "Paid by (beopari)" },
  signShop: "For the shop",
};

const ur: VoucherWords = {
  title: { paid: "ادائیگی واؤچر", received: "وصولی رسید" },
  party: { paid: "ادائیگی بنام", received: "وصولی از" },
  partyType: { paid: "کسان", received: "بیوپاری" },
  voucherNo: "واؤچر نمبر",
  date: "تاریخ",
  amount: "رقم",
  method: "بذریعہ",
  methods: { cash: "نقد", bank: "بینک", cheque: "چیک", online: "آن لائن" },
  reference: "حوالہ",
  bills: "ادا شدہ بل",
  columns: {
    no: "نمبر",
    billNo: "بل نمبر",
    billDate: "بل کی تاریخ",
    amount: "رقم",
  },
  noBills: "کوئی بل نہیں: پوری رقم پیشگی ہے۔",
  allocated: "بلوں میں ادا",
  advance: "پیشگی",
  cancelledBills: "منسوخ: یہ بل دوبارہ کھلے ہیں۔",
  notes: "نوٹ",
  signParty: { paid: "وصول کنندہ (کسان)", received: "ادا کنندہ (بیوپاری)" },
  signShop: "برائے دکان",
};

export const voucherWords: Record<ParchiLanguage, VoucherWords> = { en, ur };
