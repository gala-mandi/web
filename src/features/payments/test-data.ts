import { KISSAN } from "@/features/purchases/test-data";
import type { PurchaseSummary } from "@/features/purchases/types";
import type { ListResponse } from "@/lib/list-query";
import type { OutstandingBill } from "./allocation";
import type { CashBook, Payment, PaymentWithWarnings } from "./types";

/** Test data only. */

export const TODAY = "2026-11-06";

/** Rafiq's posted purchases, as `GET /purchases` lists them (newest first). */
export function purchaseRow(
  n: number,
  overrides: Partial<PurchaseSummary> = {},
): PurchaseSummary {
  return {
    id: `55555555-5555-4555-8555-55555555555${n}`,
    billNo: `PUR-2026-27-00000${n}`,
    purchaseDate: `2026-11-0${n}`,
    trader: { id: KISSAN.id, name: KISSAN.name },
    grossAmount: "100000.00",
    totalDeductions: "0.00",
    rounding: "0.00",
    netAmount: "100000.00",
    paidAmount: "0.00",
    outstanding: "100000.00",
    status: "posted",
    notes: null,
    createdAt: "2026-11-01T05:00:00.000Z",
    updatedAt: "2026-11-01T05:00:00.000Z",
    ...overrides,
  };
}

/**
 * Three open bills (oldest first: Rs 30,000 left on #1, Rs 50,000 on #2,
 * Rs 100,000 on #3) and a settled one (#4), newest first as the API sends.
 */
export const rafiqBills: ListResponse<PurchaseSummary> = {
  data: [
    purchaseRow(4, { outstanding: "0.00" }),
    purchaseRow(3),
    purchaseRow(2, { netAmount: "80000.00", outstanding: "50000.00" }),
    purchaseRow(1, { netAmount: "60000.00", outstanding: "30000.00" }),
  ],
  meta: { page: 1, limit: 100, total: 4 },
};

export const openBills: OutstandingBill[] = [
  {
    id: purchaseRow(1).id,
    billNo: "PUR-2026-27-000001",
    date: "2026-11-01",
    netAmount: "60000.00",
    outstanding: "30000.00",
  },
  {
    id: purchaseRow(2).id,
    billNo: "PUR-2026-27-000002",
    date: "2026-11-02",
    netAmount: "80000.00",
    outstanding: "50000.00",
  },
  {
    id: purchaseRow(3).id,
    billNo: "PUR-2026-27-000003",
    date: "2026-11-03",
    netAmount: "100000.00",
    outstanding: "100000.00",
  },
];

/** Rs 100,000 paid to Rafiq in cash: bills #1 and #2 in full, #3 in part. */
export function savedPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "dddddddd-8888-4888-8888-888888888881",
    voucherNo: "PAY-2026-27-000001",
    direction: "paid",
    paymentDate: TODAY,
    trader: { id: KISSAN.id, name: KISSAN.name },
    amount: "100000.00",
    allocated: "100000.00",
    advance: "0.00",
    method: "cash",
    reference: null,
    status: "posted",
    notes: null,
    createdAt: "2026-11-06T05:00:00.000Z",
    updatedAt: "2026-11-06T05:00:00.000Z",
    createdBy: "u1",
    allocations: [
      {
        id: "eeeeeeee-9999-4999-8999-999999999991",
        purchaseId: openBills[0].id,
        saleId: null,
        billNo: openBills[0].billNo,
        billDate: openBills[0].date,
        amount: "30000.00",
      },
      {
        id: "eeeeeeee-9999-4999-8999-999999999992",
        purchaseId: openBills[1].id,
        saleId: null,
        billNo: openBills[1].billNo,
        billDate: openBills[1].date,
        amount: "50000.00",
      },
      {
        id: "eeeeeeee-9999-4999-8999-999999999993",
        purchaseId: openBills[2].id,
        saleId: null,
        billNo: openBills[2].billNo,
        billDate: openBills[2].date,
        amount: "20000.00",
      },
    ],
    ...overrides,
  };
}

export function withWarnings(
  payment: Payment,
  warnings: PaymentWithWarnings["warnings"] = [],
): PaymentWithWarnings {
  return { ...payment, warnings };
}

/** Today: Rs 50,000 in hand from before, 80,000 received, 100,000 paid. */
export const todayCashBook: CashBook = {
  from: TODAY,
  to: TODAY,
  openingCash: "50000.00",
  days: [
    {
      date: TODAY,
      cashIn: "80000.00",
      cashOut: "100000.00",
      closingCash: "30000.00",
    },
  ],
  totals: { cashIn: "80000.00", cashOut: "100000.00" },
  closingCash: "30000.00",
};
