import {
  chanaItem,
  gandumItem,
  KISSAN,
  savedPurchase,
} from "@/features/purchases/test-data";
import type { PurchaseItemInput } from "@/features/purchases/types";
import { BEOPARI, savedSale } from "@/features/sales/test-data";
import { purchaseParchi, saleParchi } from "./parchi";
import type { ParchiShop } from "./types";

/** Test data only. */

/** 10:30 am on 6 Nov 2026 in Karachi: the "printed on" line. */
export const PRINTED_AT = new Date("2026-11-06T05:30:00.000Z");

export const shop: ParchiShop = {
  name: "Al-Madina Commission Shop",
  logoUrl: "http://localhost:4000/uploads/t1/logo.png",
  address: "Shop 12, New Grain Market, Okara",
  phone: "0300-1234567",
  footer: "Thank you for your business.\nPayments within 7 days.",
  maundKg: "40.000",
  language: "en",
};

const twoItems: PurchaseItemInput[] = [
  {
    commodityId: gandumItem.id,
    bags: 10,
    weightKg: "1010.000",
    rate: "4000",
    rateUnit: "maund",
  },
  {
    commodityId: chanaItem.id,
    bags: 6,
    weightKg: "615.500",
    rate: "6200",
    rateUnit: "maund",
  },
];

/** Gandum and Chana from Rafiq Ahmad, Rs 20,000 paid on the spot. */
export const purchaseBill = purchaseParchi(
  savedPurchase(
    { traderId: KISSAN.id, items: twoItems, notes: "Truck LES-4521" },
    { paidAmount: "20000.00" },
  ),
);

/** The same goods sold to Shahid Traders, Rs 50,000 received. */
export const saleBill = saleParchi(
  savedSale({
    buyerId: BEOPARI.id,
    items: twoItems,
    receivedAmount: "50000.00",
  }),
);

export const cancelledSaleBill = saleParchi(
  savedSale(
    { buyerId: BEOPARI.id, items: twoItems },
    { status: "cancelled", billNo: "SAL-2026-27-000002" },
  ),
);

/** 30 items and a very long kissan name: wraps and runs over sheets. */
export const longPurchaseBill = purchaseParchi(
  savedPurchase(
    {
      traderId: KISSAN.id,
      items: Array.from({ length: 30 }, (_, i) => ({
        commodityId: i % 2 ? chanaItem.id : gandumItem.id,
        bags: 5 + (i % 7),
        weightKg: `${200 + i * 13}.250`,
        rate: i % 2 ? "6200" : "4000",
        rateUnit: "maund" as const,
      })),
    },
    {
      billNo: "PUR-2026-27-000047",
      trader: {
        id: KISSAN.id,
        name: "Chaudhry Muhammad Rafiq Ahmad Khan Gondal s/o Chaudhry Ghulam Rasool Gondal, Chak No. 12/1-AL",
      },
    },
  ),
);
