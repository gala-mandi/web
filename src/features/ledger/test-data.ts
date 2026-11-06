import type {
  Balances,
  Statement,
  StatementEntry,
  TraderBalance,
} from "./types";

export const KISSAN = {
  id: "44444444-4444-4444-8444-444444444444",
  type: "kissan" as const,
  name: "Rafiq Ahmad",
};

export const PURCHASE_ID = "55555555-5555-4555-8555-555555555551";
export const SALE_ID = "eeeeeeee-8888-4888-8888-888888888881";
export const PAYMENT_ID = "99999999-9999-4999-8999-999999999991";

let nextId = 1;

export function entry(overrides: Partial<StatementEntry> = {}): StatementEntry {
  const id = nextId++;
  return {
    id,
    traderId: KISSAN.id,
    entryDate: "2026-11-02",
    sourceType: "purchase",
    sourceId: PURCHASE_ID,
    debit: "0.00",
    credit: "0.00",
    narration: null,
    createdBy: "u1",
    createdAt: "2026-11-02T05:00:00.000Z",
    balance: "0.00",
    ...overrides,
  };
}

/**
 * Rafiq's khata from 1 Nov: owed Rs 10,000 before, a purchase of Rs 100,000
 * (Cr) with Rs 20,000 paid on the same save (Dr), a payment of Rs 50,000
 * (Dr), the owner's adjustment and a cancelled sale's reversal.
 */
export const khataEntries: StatementEntry[] = [
  entry({
    sourceType: "purchase",
    credit: "100000.00",
    narration: "Purchase PUR-2026-27-000001",
    balance: "-90000.00",
  }),
  entry({
    sourceType: "purchase",
    debit: "20000.00",
    narration: "Paid on purchase PUR-2026-27-000001",
    balance: "-70000.00",
  }),
  entry({
    entryDate: "2026-11-03",
    sourceType: "payment",
    sourceId: PAYMENT_ID,
    debit: "50000.00",
    narration: "Payment PAY-2026-27-000001",
    balance: "-20000.00",
  }),
  entry({
    entryDate: "2026-11-04",
    sourceType: "adjustment",
    sourceId: null,
    debit: "500.00",
    narration: "Rounding agreed with Rafiq",
    balance: "-19500.00",
  }),
  entry({
    entryDate: "2026-11-05",
    sourceType: "reversal",
    sourceId: SALE_ID,
    credit: "1000.00",
    narration: "Sale SAL-2026-27-000001 cancelled",
    balance: "-20500.00",
  }),
];

export function statement(overrides: Partial<Statement> = {}): Statement {
  const data = overrides.data ?? khataEntries;
  return {
    trader: KISSAN,
    from: "2026-11-01",
    to: null,
    openingBalance: "10000.00",
    closingBalance: "-20500.00",
    data,
    meta: { page: 1, limit: 50, total: data.length },
    ...overrides,
  };
}

export function traderBalance(
  overrides: Partial<TraderBalance> = {},
): TraderBalance {
  return {
    traderId: KISSAN.id,
    type: "kissan",
    name: KISSAN.name,
    phone: "03001112223",
    balance: "-20500.00",
    receivable: "0.00",
    payable: "20500.00",
    ...overrides,
  };
}

export function balances(rows: TraderBalance[]): Balances {
  return {
    data: rows,
    totals: { receivable: "75000.00", payable: "20500.00" },
    meta: { page: 1, limit: 20, total: rows.length },
  };
}
