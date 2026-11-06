/**
 * Reports as the server returns them, for component tests, e2e and
 * screenshots: a busy month of a mandi shop in Okara. Totals are added up
 * here in whole paisa so they are exact (test data only: the app never adds
 * money up, it shows the server's totals).
 */
import {
  commodityIds,
  purchasesByDay,
  salesByDay,
  TODAY,
} from "@/features/dashboard/test-data";
import type {
  BookRow,
  CommissionReport,
  OutstandingReport,
  OutstandingTrader,
  PurchaseMetrics,
  PurchasesReport,
  SaleMetrics,
  SalesReport,
} from "@/features/dashboard/types";
import type { CashBook } from "@/features/payments/types";

export { TODAY };
/** "This month" on TODAY. */
export const MONTH_FROM = "2026-11-01";
/** "This week" on TODAY (a Friday): Monday 2 Nov. */
export const WEEK_FROM = "2026-11-02";

const paisa = (rupees: string) => {
  const [int, dec = ""] = rupees.split(".");
  return Number(int) * 100 + Number(dec.padEnd(2, "0"));
};
const rupees = (p: number) =>
  `${Math.floor(p / 100)}.${String(p % 100).padStart(2, "0")}`;
const grams = (kg: string) => {
  const [int, dec = ""] = kg.split(".");
  return Number(int) * 1000 + Number(dec.padEnd(3, "0"));
};
const kg = (g: number) =>
  `${Math.floor(g / 1000)}.${String(g % 1000).padStart(3, "0")}`;

type Metrics = PurchaseMetrics & SaleMetrics;
const moneyFields = [
  "grossAmount",
  "totalDeductions",
  "totalCharges",
  "netAmount",
] as const;

/** Totals of rows, in paisa and grams; null fields stay null. */
function sum<M extends Partial<Metrics>>(
  rows: Partial<Metrics>[],
  template: M,
): M {
  const out: Record<string, unknown> = { ...template };
  out.bills = rows.reduce((n, r) => n + (r.bills ?? 0), 0);
  out.bags = rows.reduce((n, r) => n + (r.bags ?? 0), 0);
  out.weightKg = kg(rows.reduce((n, r) => n + grams(r.weightKg ?? "0"), 0));
  for (const field of moneyFields) {
    if (!(field in template)) continue;
    out[field] =
      template[field] === null
        ? null
        : rupees(rows.reduce((n, r) => n + paisa(r[field] ?? "0"), 0));
  }
  return out as M;
}

/** A day-grouped book cut to `from`..`to`, with its totals. */
export function bookOfRange<R extends PurchasesReport | SalesReport>(
  report: R,
  from: string,
  to: string,
): R {
  const rows = report.rows.filter((r) => r.key >= from && r.key <= to);
  return {
    ...report,
    from,
    to,
    rows,
    totals: sum(rows, report.totals),
  } as R;
}

export const monthPurchases: PurchasesReport = bookOfRange(
  purchasesByDay,
  MONTH_FROM,
  TODAY,
);
export const monthSales: SalesReport = bookOfRange(
  salesByDay,
  MONTH_FROM,
  TODAY,
);

/** Commodities as `GET /commodities` lists them, with Urdu names. */
export const commodities = [
  [commodityIds.rice, "Chawal (Basmati)", "چاول"],
  [commodityIds.wheat, "Gandum", "گندم"],
  [commodityIds.cotton, "Kapas", "کپاس"],
  [commodityIds.maize, "Makai", "مکئی"],
].map(([id, name, nameUr]) => ({
  id,
  name,
  nameUr,
  category: "grain",
  defaultUnit: "maund" as const,
  bagWeightKg: null,
  commissionPct: null,
  marketFeePct: null,
  labourPerBag: null,
  isActive: true,
  createdAt: "2026-10-01T05:00:00.000Z",
  updatedAt: "2026-10-01T05:00:00.000Z",
}));

/** `?groupBy=commodity`: names A–Z; deductions and net are bill-level (null). */
export const monthPurchasesByCommodity: PurchasesReport = (() => {
  const split = [
    [
      commodityIds.rice,
      "Chawal (Basmati)",
      18,
      756,
      "37812.500",
      "38421500.00",
    ],
    [commodityIds.wheat, "Gandum", 41, 1722, "86104.250", "35612750.50"],
    [commodityIds.cotton, "Kapas", 6, 180, "7200.000", "6480000.00"],
    [commodityIds.maize, "Makai", 12, 504, "25200.750", "6451200.00"],
  ] as const;
  const rows: BookRow<PurchaseMetrics>[] = split.map(
    ([key, label, bills, bags, weightKg, grossAmount]) => ({
      key,
      label,
      bills,
      bags,
      weightKg,
      grossAmount,
      totalDeductions: null,
      netAmount: null,
    }),
  );
  return {
    ...monthPurchases,
    groupBy: "commodity",
    rows,
    totals: sum(rows, {
      ...monthPurchases.totals,
      totalDeductions: null,
      netAmount: null,
    }),
  };
})();

/** `?groupBy=trader`: the month's kissans, A–Z. */
export const monthPurchasesByTrader: PurchasesReport = (() => {
  const kissans = [
    ["Abdul Sattar", 7, "1624000.00"],
    ["Allah Ditta", 5, "1188450.50"],
    ["Ghulam Rasool", 9, "2310700.00"],
    ["Haji Bashir Ahmad", 11, "2895250.25"],
    ["Muhammad Akram", 8, "1975300.00"],
    ["Muhammad Iqbal", 6, "1402800.00"],
    ["Noor Muhammad", 4, "905600.00"],
    ["Rafiq Ahmad", 10, "2488125.75"],
  ] as const;
  const rows: BookRow<PurchaseMetrics>[] = kissans.map(
    ([label, bills, net], i) => {
      const deductions = bills * 95_000;
      return {
        key: `0000000${i + 1}-bbbb-4bbb-8bbb-${String(i + 1).padStart(12, "0")}`,
        label,
        bills,
        bags: bills * 42,
        weightKg: kg(bills * 42 * 50_000 + bills * 125),
        grossAmount: rupees(paisa(net) + deductions),
        totalDeductions: rupees(deductions),
        netAmount: net,
      };
    },
  );
  return {
    ...monthPurchases,
    groupBy: "trader",
    rows,
    totals: sum(rows, monthPurchases.totals),
  };
})();

/* ------------------------------------------------------------------ */

/** Commission of each day with bills: 2.5% and 2% of the day's nets. */
export function commissionOfRange(from: string, to: string): CommissionReport {
  const purchases = bookOfRange(purchasesByDay, from, to).rows;
  const sales = new Map(
    bookOfRange(salesByDay, from, to).rows.map((r) => [r.key, r]),
  );
  let tp = 0;
  let ts = 0;
  const days = purchases.map((row) => {
    const p = Math.round((paisa(row.netAmount ?? "0") * 25) / 1000);
    const sale = sales.get(row.key);
    const s = sale ? Math.round((paisa(sale.netAmount ?? "0") * 2) / 100) : 0;
    tp += p;
    ts += s;
    return {
      date: row.key,
      purchases: rupees(p),
      sales: rupees(s),
      total: rupees(p + s),
    };
  });
  const side = (p: number, s: number) => ({
    purchases: rupees(p),
    sales: rupees(s),
    total: rupees(p + s),
  });
  return {
    from,
    to,
    days,
    totals: side(tp, ts),
    otherCharges: {
      marketFee: side(Math.round(tp / 5), Math.round(ts / 5)),
      labour: side(days.length * 63_000, days.length * 52_500),
      other: side(0, days.length * 10_000),
    },
  };
}

export const monthCommission = commissionOfRange(MONTH_FROM, TODAY);

export const emptyCommission: CommissionReport = {
  from: MONTH_FROM,
  to: TODAY,
  days: [],
  totals: { purchases: "0.00", sales: "0.00", total: "0.00" },
  otherCharges: {
    marketFee: { purchases: "0.00", sales: "0.00", total: "0.00" },
    labour: { purchases: "0.00", sales: "0.00", total: "0.00" },
    other: { purchases: "0.00", sales: "0.00", total: "0.00" },
  },
};

/* ------------------------------------------------------------------ */

/** Cash in hand day by day: Rs 2,12,400 at the start of the month. */
export function cashBookOfRange(from: string, to: string): CashBook {
  let cash = paisa("212400.00");
  let totalIn = 0;
  let totalOut = 0;
  const rows = bookOfRange(salesByDay, from, to).rows;
  const openingCash = rupees(cash);
  const days = rows.map((row, i) => {
    const cashIn = 18_000_000 + ((i * 7_350_000) % 23_000_000);
    const cashOut = 16_500_000 + ((i * 6_120_000) % 21_000_000);
    cash += cashIn - cashOut;
    totalIn += cashIn;
    totalOut += cashOut;
    return {
      date: row.key,
      cashIn: rupees(cashIn),
      cashOut: rupees(cashOut),
      closingCash: rupees(cash),
    };
  });
  return {
    from,
    to,
    openingCash,
    days,
    totals: { cashIn: rupees(totalIn), cashOut: rupees(totalOut) },
    closingCash: rupees(cash),
  };
}

export const monthCashBook = cashBookOfRange(MONTH_FROM, TODAY);

/* ------------------------------------------------------------------ */

const trader = (
  i: number,
  type: OutstandingTrader["type"],
  name: string,
  amount: string,
): OutstandingTrader => ({
  traderId: `0000000${i % 10}-cccc-4ccc-8ccc-${String(i).padStart(12, "0")}`,
  type,
  name,
  phone:
    i % 4 === 3 ? null : `03${String(10_000_0000 + i * 7_654_321).slice(0, 9)}`,
  amount,
});

const side = (traders: OutstandingTrader[]) => ({
  total: rupees(traders.reduce((n, t) => n + paisa(t.amount), 0)),
  count: traders.length,
  traders,
});

/** `GET /reports/outstanding` (no limit): every trader with a balance. */
export const fullOutstanding: OutstandingReport = {
  asOf: null,
  receivable: side(
    (
      [
        ["beopari", "Malik Traders", "1245000.00"],
        ["beopari", "Chaudhry Flour Mills", "986500.50"],
        ["beopari", "Al-Madina Rice Co.", "742300.00"],
        ["kissan", "Muhammad Akram", "512000.00"],
        ["beopari", "Sheikh Brothers", "468750.25"],
        ["beopari", "Bismillah Grain Store", "395000.00"],
        ["arhti", "Rana Commission Shop", "312400.00"],
        ["beopari", "Punjab Feeds", "276900.00"],
        ["kissan", "Ghulam Rasool", "198250.00"],
        ["beopari", "Ittefaq Traders", "154600.00"],
        ["beopari", "Hafiz Brothers", "121350.00"],
        ["beopari", "Madni Atta Chakki", "98400.00"],
      ] as const
    ).map(([type, name, amount], i) => trader(i + 1, type, name, amount)),
  ),
  payable: side(
    (
      [
        ["kissan", "Haji Bashir Ahmad", "865000.00"],
        ["kissan", "Abdul Sattar", "642350.00"],
        ["kissan", "Muhammad Iqbal", "511200.00"],
        ["kissan", "Allah Ditta", "402000.00"],
        ["kissan", "Noor Muhammad", "318750.00"],
        ["arhti", "Saeed & Sons", "286400.00"],
        ["kissan", "Zafar Iqbal", "221000.00"],
        ["kissan", "Mehmood Khan", "174300.00"],
      ] as const
    ).map(([type, name, amount], i) => trader(i + 21, type, name, amount)),
  ),
};

export const emptyOutstanding: OutstandingReport = {
  asOf: null,
  receivable: { total: "0.00", count: 0, traders: [] },
  payable: { total: "0.00", count: 0, traders: [] },
};

/** An empty shop's book for the month (zeros, no rows). */
export const emptyBook: PurchasesReport & SalesReport = {
  from: MONTH_FROM,
  to: TODAY,
  groupBy: "day",
  commodity: null,
  trader: null,
  rows: [],
  totals: {
    bills: 0,
    bags: 0,
    weightKg: "0.000",
    grossAmount: "0.00",
    totalDeductions: "0.00",
    totalCharges: "0.00",
    netAmount: "0.00",
  },
};

export const emptyCashBook: CashBook = {
  from: MONTH_FROM,
  to: TODAY,
  openingCash: "0.00",
  days: [],
  totals: { cashIn: "0.00", cashOut: "0.00" },
  closingCash: "0.00",
};
