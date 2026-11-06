import type { PurchaseStatus, RateUnit } from "@/features/purchases/types";
import type { ChargeLine } from "@/lib/charges/calculate-transaction";

/** Shapes behind the printed parchi (purchase or sale bill). */

/** A purchase from a kissan or a sale to a beopari. */
export type ParchiKind = "purchase" | "sale";

/** The parchi's language: it is handed to the trader, so it has its own. */
export const parchiLanguages = ["en", "ur"] as const;
export type ParchiLanguage = (typeof parchiLanguages)[number];

/** A4 and A5 sheets (laser/inkjet) or an 80 mm thermal roll. */
export const paperSizes = ["a4", "a5", "thermal80"] as const;
export type PaperSize = (typeof paperSizes)[number];

export interface ParchiItem {
  id: string;
  commodityName: string;
  bags: number | null;
  /** Kg, e.g. "1010.000". */
  weightKg: string;
  rate: string;
  rateUnit: RateUnit;
  amount: string;
}

/**
 * One saved bill as the parchi prints it. Every amount is the server's
 * string, only formatted: the parchi does no money maths.
 */
export interface ParchiBill {
  kind: ParchiKind;
  billNo: string;
  /** Asia/Karachi day, YYYY-MM-DD. */
  date: string;
  status: PurchaseStatus;
  /** The kissan (purchase) or beopari (sale). */
  partyName: string;
  items: readonly ParchiItem[];
  grossAmount: string;
  /** Deductions on a purchase, added charges on a sale. */
  charges: readonly ChargeLine[];
  totalCharges: string;
  rounding: string;
  netAmount: string;
  /** Paid to the kissan / received from the beopari on the same save. */
  settledAmount: string;
  notes: string | null;
}

/** The shop's header and footer on the parchi. */
export interface ParchiShop {
  /** The parchi name from Settings, or the shop name. */
  name: string;
  logoUrl: string | null;
  /** "Shop 12, Grain Market, Okara"; null when unknown. */
  address: string | null;
  phone: string | null;
  footer: string | null;
  /** Kg in one maund (normally "40"). */
  maundKg: string;
  /** The shop's default parchi language, when known. */
  language: ParchiLanguage | null;
}
