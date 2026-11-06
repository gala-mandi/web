/**
 * A busy month of a mandi shop as the reports API returns it, for component
 * tests, e2e and screenshots. Built from whole paisa so every total is exact
 * (test data only; the app never adds money up).
 */
import type { Rate } from "@/features/rates/types";
import type {
  BookReport,
  BookRow,
  DailySummary,
  OutstandingReport,
  OutstandingTrader,
} from "./types";

export const TODAY = "2026-11-06";
export const FROM = "2026-10-08";

const rupees = (paisa: number) =>
  `${Math.floor(paisa / 100)}.${String(paisa % 100).padStart(2, "0")}`;
const kg = (grams: number) =>
  `${Math.floor(grams / 1000)}.${String(grams % 1000).padStart(3, "0")}`;

/** 30 dates from FROM to TODAY. */
function days(): string[] {
  const out: string[] = [];
  const day = new Date(`${FROM}T00:00:00Z`);
  for (let i = 0; i < 30; i += 1) {
    out.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return out;
}

/** Days the shop was closed: no bills, so the reports leave them out. */
export const CLOSED_DAYS = ["2026-10-17", "2026-10-31"];

/** A smooth, repeatable wave (no Math.random: snapshots stay stable). */
const wave = (i: number, phase: number, base: number, swing: number) =>
  Math.round(
    base +
      swing * Math.sin((i + phase) / 3.1) +
      (swing / 3) * Math.cos((i * 7 + phase) / 5),
  );

function book(kind: "purchases" | "sales"): BookReport {
  const rows: BookRow[] = [];
  let bills = 0;
  let bags = 0;
  let grams = 0;
  let gross = 0;
  let net = 0;
  days().forEach((date, i) => {
    if (CLOSED_DAYS.includes(date)) return;
    const n = kind === "purchases" ? wave(i, 0, 14, 5) : wave(i, 2, 11, 4);
    const dayNet =
      kind === "purchases"
        ? wave(i, 0, 78_000_000, 26_000_000) + 37
        : wave(i, 2, 66_000_000, 24_000_000) + 50;
    const dayGross = dayNet + (kind === "purchases" ? 1 : -1) * n * 95_000;
    const dayBags = n * 42;
    const dayGrams = dayBags * 50_000 + n * 125;
    rows.push({
      key: date,
      label: date,
      bills: n,
      bags: dayBags,
      weightKg: kg(dayGrams),
      grossAmount: rupees(dayGross),
      netAmount: rupees(dayNet),
    });
    bills += n;
    bags += dayBags;
    grams += dayGrams;
    gross += dayGross;
    net += dayNet;
  });
  return {
    from: FROM,
    to: TODAY,
    groupBy: "day",
    commodity: null,
    trader: null,
    rows,
    totals: {
      bills,
      bags,
      weightKg: kg(grams),
      grossAmount: rupees(gross),
      netAmount: rupees(net),
    },
  };
}

export const purchasesByDay: BookReport = book("purchases");
export const salesByDay: BookReport = book("sales");

const todayRow = (report: BookReport) =>
  report.rows.find((r) => r.key === TODAY) as BookRow;

export const commodityIds = {
  wheat: "22222222-2222-4222-8222-222222222222",
  rice: "11111111-1111-4111-8111-111111111111",
  maize: "33333333-3333-4333-8333-333333333333",
  cotton: "44444444-4444-4444-8444-444444444444",
} as const;

/** `GET /reports/purchases?groupBy=commodity`: name order, as the server sends it. */
export const purchasesByCommodity: BookReport = {
  ...purchasesByDay,
  groupBy: "commodity",
  rows: [
    ["rice", "Chawal (Basmati)", 182_400_000],
    ["cotton", "Kapas", 21_600_000],
    ["wheat", "Gandum", 611_250_500],
    ["maize", "Makai", 96_800_000],
  ].map(([key, label, grams]) => ({
    key: commodityIds[key as keyof typeof commodityIds],
    label: label as string,
    bills: 40,
    bags: 900,
    weightKg: kg(grams as number),
    grossAmount: "1000000.00",
    netAmount: null,
  })),
  totals: { ...purchasesByDay.totals, netAmount: null },
};

function history(
  commodityId: string,
  base: number,
  swing: number,
  missing: number[],
  unit: Rate["rateUnit"] = "maund",
): Rate[] {
  return days()
    .map((date, i): Rate | null => {
      if (missing.includes(i)) return null;
      const mid = wave(i, 1, base, swing);
      return {
        id: `${commodityId.slice(0, 8)}-rate-${i}`,
        commodityId,
        rateDate: date,
        minRate: `${mid - Math.round(swing * 0.6)}.00`,
        maxRate: `${mid + Math.round(swing * 0.5)}.00`,
        avgRate: i % 9 === 4 ? null : `${mid}.50`,
        rateUnit: unit,
        createdAt: `${date}T04:00:00.000Z`,
        updatedAt: `${date}T04:00:00.000Z`,
      };
    })
    .filter((r): r is Rate => r !== null);
}

/** `GET /rates?commodity=&from=&to=` per top commodity, oldest first. */
export const rateHistories: Record<string, Rate[]> = {
  [commodityIds.wheat]: history(commodityIds.wheat, 4_150, 140, [9, 23]),
  [commodityIds.rice]: history(commodityIds.rice, 10_200, 420, [9, 16, 23]),
  [commodityIds.maize]: history(commodityIds.maize, 2_560, 110, [9, 23]),
};

const todaysRates = Object.values(rateHistories)
  .map((rates) => rates.at(-1) as Rate)
  .sort((a, b) => a.commodityId.localeCompare(b.commodityId));

const p = todayRow(purchasesByDay);
const s = todayRow(salesByDay);

/** `GET /reports/daily-summary` for TODAY: the same day as the report rows. */
export const dailySummary: DailySummary = {
  date: TODAY,
  purchases: {
    bills: p.bills,
    bags: p.bags,
    weightKg: p.weightKg,
    grossAmount: p.grossAmount,
    totalDeductions: "18240.00",
    netAmount: p.netAmount as string,
    paidOnBills: "150000.00",
  },
  sales: {
    bills: s.bills,
    bags: s.bags,
    weightKg: s.weightKg,
    grossAmount: s.grossAmount,
    totalCharges: "21560.50",
    netAmount: s.netAmount as string,
    receivedOnBills: "95000.00",
  },
  commission: { purchases: "15620.40", sales: "13245.10", total: "28865.50" },
  payments: {
    paid: { count: 6, amount: "410000.00" },
    received: { count: 4, amount: "365500.00" },
  },
  cash: {
    openingCash: "212400.00",
    cashIn: "380500.00",
    cashOut: "295000.00",
    closingCash: "297900.00",
  },
  cancelled: { purchases: 1, sales: 0, payments: 0 },
  rates: todaysRates,
};

const trader = (
  i: number,
  type: OutstandingTrader["type"],
  name: string,
  amount: string,
): OutstandingTrader => ({
  traderId: `0000000${i}-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`,
  type,
  name,
  phone: `0300${String(1_000_000 + i).slice(1)}`,
  amount,
});

/** `GET /reports/outstanding?limit=10`: 24 receivable and 13 payable traders. */
export const outstanding: OutstandingReport = {
  asOf: null,
  receivable: {
    total: "6843250.75",
    count: 24,
    traders: [
      trader(1, "beopari", "Malik Traders", "1245000.00"),
      trader(2, "beopari", "Chaudhry Flour Mills", "986500.50"),
      trader(3, "beopari", "Al-Madina Rice Co.", "742300.00"),
      trader(4, "kissan", "Muhammad Akram", "512000.00"),
      trader(5, "beopari", "Sheikh Brothers", "468750.25"),
      trader(6, "beopari", "Bismillah Grain Store", "395000.00"),
      trader(7, "arhti", "Rana Commission Shop", "312400.00"),
      trader(8, "beopari", "Punjab Feeds", "276900.00"),
      trader(9, "kissan", "Ghulam Rasool", "198250.00"),
      trader(10, "beopari", "Ittefaq Traders", "154600.00"),
    ],
  },
  payable: {
    total: "3912480.00",
    count: 13,
    traders: [
      trader(11, "kissan", "Haji Bashir Ahmad", "865000.00"),
      trader(12, "kissan", "Abdul Sattar", "642350.00"),
      trader(13, "kissan", "Muhammad Iqbal", "511200.00"),
      trader(14, "kissan", "Allah Ditta", "402000.00"),
      trader(15, "kissan", "Noor Muhammad", "318750.00"),
      trader(16, "arhti", "Saeed & Sons", "286400.00"),
      trader(17, "kissan", "Zafar Iqbal", "221000.00"),
      trader(18, "kissan", "Mehmood Khan", "174300.00"),
      trader(19, "kissan", "Riaz Hussain", "126480.00"),
      trader(20, "kissan", "Javed Ali", "98000.00"),
    ],
  },
};

const emptyBook = (groupBy: BookReport["groupBy"]): BookReport => ({
  from: FROM,
  to: TODAY,
  groupBy,
  commodity: null,
  trader: null,
  rows: [],
  totals: {
    bills: 0,
    bags: 0,
    weightKg: "0.000",
    grossAmount: "0.00",
    netAmount: "0.00",
  },
});

/** A shop created today: every report answers zeros and empty lists. */
export const emptyShop = {
  summary: {
    date: TODAY,
    purchases: {
      bills: 0,
      bags: 0,
      weightKg: "0.000",
      grossAmount: "0.00",
      totalDeductions: "0.00",
      netAmount: "0.00",
      paidOnBills: "0.00",
    },
    sales: {
      bills: 0,
      bags: 0,
      weightKg: "0.000",
      grossAmount: "0.00",
      totalCharges: "0.00",
      netAmount: "0.00",
      receivedOnBills: "0.00",
    },
    commission: { purchases: "0.00", sales: "0.00", total: "0.00" },
    payments: {
      paid: { count: 0, amount: "0.00" },
      received: { count: 0, amount: "0.00" },
    },
    cash: {
      openingCash: "0.00",
      cashIn: "0.00",
      cashOut: "0.00",
      closingCash: "0.00",
    },
    cancelled: { purchases: 0, sales: 0, payments: 0 },
    rates: [],
  } satisfies DailySummary,
  book: emptyBook("day"),
  byCommodity: emptyBook("commodity"),
  outstanding: {
    asOf: null,
    receivable: { total: "0.00", count: 0, traders: [] },
    payable: { total: "0.00", count: 0, traders: [] },
  } satisfies OutstandingReport,
};

/** Commodity rows as `GET /commodities` lists them (for names). */
export const commodityList = [
  [commodityIds.rice, "Chawal (Basmati)"],
  [commodityIds.wheat, "Gandum"],
  [commodityIds.cotton, "Kapas"],
  [commodityIds.maize, "Makai"],
].map(([id, name]) => ({
  id,
  name,
  nameUr: null,
  category: "grain",
  defaultUnit: "maund",
  bagWeightKg: null,
  commissionPct: null,
  marketFeePct: null,
  labourPerBag: null,
  isActive: true,
  createdAt: "2026-10-01T05:00:00.000Z",
  updatedAt: "2026-10-01T05:00:00.000Z",
}));
