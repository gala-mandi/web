import type {
  CommissionReport,
  DailySummary,
  OutstandingReport,
  OutstandingSide,
  PurchasesReport,
  ReportGroup,
  SalesReport,
  Sides,
} from "@/features/dashboard/types";
import { paymentText } from "@/features/payments/text";
import type { CashBook } from "@/features/payments/types";
import { formatDate, karachiToday } from "@/lib/format";
import { ledgerRoutes, type ReportSlug } from "@/lib/routes";
import { reportText } from "./text";

/**
 * One model per report, built from the server's response, that the screen
 * table, the print / PDF layout and the Excel file all read. Values stay the
 * server's strings (money, kg) and the totals row is the server's totals, so
 * what is printed or exported always matches the screen. No maths here.
 */

export type ReportCell =
  | {
      kind: "text";
      value: string;
      /** An Urdu name shown beside it (screen and print). */
      secondary?: string | null;
      /** A link on screen (e.g. the trader's khata). */
      href?: string;
      hrefLabel?: string;
    }
  /** A `YYYY-MM-DD` day. */
  | { kind: "date"; value: string }
  /** Rupees as the server sends them; null for "not given". */
  | { kind: "money"; value: string | null }
  /** Kg (3 decimals) as the server sends them; shown as maund + kg. */
  | { kind: "kg"; value: string | null }
  | { kind: "count"; value: number };

export type CellKind = ReportCell["kind"];

export interface ReportColumn {
  id: string;
  label: string;
  kind: CellKind;
}

export interface ReportRow {
  id: string;
  cells: ReportCell[];
}

export interface ReportTable {
  id: string;
  title?: string;
  /** Accessible name of the screen table. */
  caption: string;
  /** `pairs`: label / value lines (a card on screen). */
  layout: "table" | "pairs";
  columns: ReportColumn[];
  rows: ReportRow[];
  /** The server's totals in column order; the first cell is the label. */
  totals: ReportCell[] | null;
  /** Shown instead of the rows when there are none. */
  empty?: string;
  note?: string;
}

export interface ReportSheet {
  slug: ReportSlug;
  /** "Purchases report" */
  title: string;
  /** "1 Nov 2026 – 6 Nov 2026" */
  period: string;
  /** For the file name: "2026-11-01_2026-11-06" (or one day). */
  periodKey: string;
  /** Filter lines under the period, e.g. ["Group by", "Commodity"]. */
  filters: [string, string][];
  tables: ReportTable[];
}

const text = (value: string, more: Partial<ReportCell> = {}): ReportCell =>
  ({ kind: "text", value, ...more }) as ReportCell;
const money = (value: string | null): ReportCell => ({ kind: "money", value });
const kg = (value: string | null): ReportCell => ({ kind: "kg", value });
const count = (value: number): ReportCell => ({ kind: "count", value });
const date = (value: string): ReportCell => ({ kind: "date", value });

const col = (id: string, label: string, kind: CellKind): ReportColumn => ({
  id,
  label,
  kind,
});

/** One label / value line of a `pairs` table. */
const pair = (id: string, label: string, value: ReportCell): ReportRow => ({
  id,
  cells: [text(label), value],
});

const pairColumns = [
  col("item", reportText.document.item, "text"),
  col("value", reportText.document.value, "text"),
];

function rangeOf(from: string, to: string) {
  return {
    period: reportText.range.period(formatDate(from), formatDate(to)),
    periodKey: from === to ? from : `${from}_${to}`,
  };
}

const t = reportText;

/* ------------------------------------------------------------------ */

export type BookKind = "purchases" | "sales";

export interface BookSheetContext {
  /** Names of the filters in use, for the heading lines. */
  commodityName?: string | null;
  traderName?: string | null;
  /** Urdu names of commodities by id (from `GET /commodities`). */
  urduNames?: ReadonlyMap<string, string | null>;
}

/** Purchases or sales, grouped by day, commodity or trader. */
export function bookSheet(
  kind: BookKind,
  report: PurchasesReport | SalesReport,
  ctx: BookSheetContext = {},
): ReportSheet {
  const b = t.book;
  const charges = (m: object): string | null =>
    kind === "purchases"
      ? (m as PurchasesReport["totals"]).totalDeductions
      : (m as SalesReport["totals"]).totalCharges;
  // Bill-level amounts are null when bills are split by commodity.
  const billLevel = report.totals.netAmount !== null;
  const group = report.groupBy;
  const groupLabel =
    group === "trader" ? b.group.trader[kind] : b.group[group as "day"];

  const columns = [
    col("group", groupLabel, group === "day" ? "date" : "text"),
    col("bills", b.bills, "count"),
    col("bags", b.bags, "count"),
    col("weight", b.weight, "kg"),
    col("gross", b.gross, "money"),
    ...(billLevel
      ? [
          col(
            "charges",
            kind === "purchases" ? b.deductions : b.charges,
            "money",
          ),
          col("net", b.net, "money"),
        ]
      : []),
  ];

  const metrics = (m: PurchasesReport["totals"] | SalesReport["totals"]) => [
    count(m.bills),
    count(m.bags),
    kg(m.weightKg),
    money(m.grossAmount),
    ...(billLevel ? [money(charges(m)), money(m.netAmount)] : []),
  ];

  const groupCell = (key: string, label: string): ReportCell => {
    if (group === "day") return date(key);
    if (group === "commodity") {
      return text(label, { secondary: ctx.urduNames?.get(key) ?? null });
    }
    return text(label, {
      href: ledgerRoutes.khata(key),
      hrefLabel: t.outstanding.openKhata(label),
    });
  };

  const filters: [string, string][] = [
    [t.filters.groupBy, t.filters.groups[group as ReportGroup]],
  ];
  if (ctx.commodityName) filters.push([t.filters.commodity, ctx.commodityName]);
  if (ctx.traderName) {
    filters.push([
      kind === "purchases" ? t.filters.kissan : t.filters.beopari,
      ctx.traderName,
    ]);
  }

  return {
    slug: kind,
    title: t.documentTitle(t.reports[kind].title),
    ...rangeOf(report.from, report.to),
    filters,
    tables: [
      {
        id: kind,
        caption: b.caption(t.reports[kind].title),
        layout: "table",
        columns,
        rows: report.rows.map((row) => ({
          id: row.key,
          cells: [groupCell(row.key, row.label), ...metrics(row)],
        })),
        totals: [text(t.total), ...metrics(report.totals)],
        empty: b.empty[kind],
        note: billLevel ? undefined : b.perBillNote,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */

const sides = (s: Sides) => [
  money(s.purchases),
  money(s.sales),
  money(s.total),
];

/** Commission per day with the server's totals; other charges apart. */
export function commissionSheet(report: CommissionReport): ReportSheet {
  const c = t.commission;
  const o = c.other;
  return {
    slug: "commission",
    title: t.documentTitle(t.reports.commission.title),
    ...rangeOf(report.from, report.to),
    filters: [],
    tables: [
      {
        id: "commission",
        title: c.title,
        caption: c.caption,
        layout: "table",
        columns: [
          col("date", c.date, "date"),
          col("purchases", c.onPurchases, "money"),
          col("sales", c.onSales, "money"),
          col("total", c.total, "money"),
        ],
        rows: report.days.map((day) => ({
          id: day.date,
          cells: [date(day.date), ...sides(day)],
        })),
        totals: [text(t.total), ...sides(report.totals)],
        empty: c.empty,
      },
      {
        id: "other-charges",
        title: o.title,
        caption: o.caption,
        layout: "table",
        columns: [
          col("charge", o.charge, "text"),
          col("purchases", c.onPurchases, "money"),
          col("sales", c.onSales, "money"),
          col("total", c.total, "money"),
        ],
        rows: (
          [
            ["marketFee", o.marketFee],
            ["labour", o.labour],
            ["other", o.other],
          ] as const
        ).map(([id, label]) => ({
          id,
          cells: [text(label), ...sides(report.otherCharges[id])],
        })),
        totals: null,
        note: c.otherNote,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */

function outstandingTable(
  id: "receivable" | "payable",
  side: OutstandingSide,
): ReportTable {
  const o = t.outstanding;
  return {
    id,
    title: o[id].title,
    caption: o[id].caption,
    layout: "table",
    columns: [
      col("trader", o.trader, "text"),
      col("type", o.type, "text"),
      col("phone", o.phone, "text"),
      col("amount", o.amount, "money"),
    ],
    rows: side.traders.map((trader) => ({
      id: trader.traderId,
      cells: [
        text(trader.name, {
          href: ledgerRoutes.khata(trader.traderId),
          hrefLabel: o.openKhata(trader.name),
        }),
        text(t.traderTypes[trader.type]),
        text(trader.phone ?? ""),
        money(trader.amount),
      ],
    })),
    totals: [
      text(t.totalOf(t.traders(side.count))),
      text(""),
      text(""),
      money(side.total),
    ],
    empty: o[id].empty,
  };
}

/** Receivable and payable, each with the server's total. */
export function outstandingSheet(
  report: OutstandingReport,
  typeFilter?: string | null,
): ReportSheet {
  return {
    slug: "outstanding",
    title: t.documentTitle(t.reports.outstanding.title),
    period: t.asOf.period(report.asOf ? formatDate(report.asOf) : null),
    // "Up to now" is saved under today's date.
    periodKey: report.asOf ?? karachiToday(),
    filters: typeFilter ? [[t.filters.traderType, typeFilter]] : [],
    tables: [
      outstandingTable("receivable", report.receivable),
      outstandingTable("payable", report.payable),
    ],
  };
}

/* ------------------------------------------------------------------ */

/**
 * The cash book's days; each day opens with the day before's closing (the
 * first with the opening cash), as on screen. Totals: the server's.
 */
export function cashBookSheet(book: CashBook): ReportSheet {
  // The same headings as the cash book's own table.
  const d = paymentText.cashBook.days;
  return {
    slug: "cash-book",
    title: t.documentTitle(t.reports["cash-book"].title),
    ...rangeOf(book.from, book.to),
    filters: [],
    tables: [
      {
        id: "cash-book",
        title: t.cashBook.title,
        caption: t.cashBook.title,
        layout: "table",
        columns: [
          col("date", d.date, "date"),
          col("opening", d.opening, "money"),
          col("cashIn", d.cashIn, "money"),
          col("cashOut", d.cashOut, "money"),
          col("closing", d.closing, "money"),
        ],
        rows: book.days.map((day, i) => ({
          id: day.date,
          cells: [
            date(day.date),
            money(i === 0 ? book.openingCash : book.days[i - 1].closingCash),
            money(day.cashIn),
            money(day.cashOut),
            money(day.closingCash),
          ],
        })),
        totals: [
          text(t.total),
          money(book.openingCash),
          money(book.totals.cashIn),
          money(book.totals.cashOut),
          money(book.closingCash),
        ],
        empty: d.empty,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */

export interface CommodityNames {
  name: string;
  nameUr: string | null;
}

/** The day's figures as label / value cards, and the day's rates. */
export function dailySummarySheet(
  summary: DailySummary,
  commodities: ReadonlyMap<string, CommodityNames> = new Map(),
): ReportSheet {
  const d = t.daily;
  const p = summary.purchases;
  const s = summary.sales;
  const pairs = (
    id: string,
    title: string,
    rows: [string, string, ReportCell][],
  ): ReportTable => ({
    id,
    title,
    caption: title,
    layout: "pairs",
    columns: pairColumns,
    rows: rows.map(([rowId, label, value]) => pair(rowId, label, value)),
    totals: null,
  });

  return {
    slug: "daily-summary",
    title: t.documentTitle(t.reports["daily-summary"].title),
    period: formatDate(summary.date),
    periodKey: summary.date,
    filters: [],
    tables: [
      pairs("purchases", d.purchases.title, [
        ["bills", d.purchases.bills, count(p.bills)],
        ["bags", d.purchases.bags, count(p.bags)],
        ["weight", d.purchases.weight, kg(p.weightKg)],
        ["gross", d.purchases.gross, money(p.grossAmount)],
        ["deductions", d.purchases.deductions, money(p.totalDeductions)],
        ["net", d.purchases.net, money(p.netAmount)],
        ["paid", d.purchases.paidOnBills, money(p.paidOnBills)],
      ]),
      pairs("sales", d.sales.title, [
        ["bills", d.sales.bills, count(s.bills)],
        ["bags", d.sales.bags, count(s.bags)],
        ["weight", d.sales.weight, kg(s.weightKg)],
        ["gross", d.sales.gross, money(s.grossAmount)],
        ["charges", d.sales.charges, money(s.totalCharges)],
        ["net", d.sales.net, money(s.netAmount)],
        ["received", d.sales.receivedOnBills, money(s.receivedOnBills)],
      ]),
      pairs("commission", d.commission.title, [
        [
          "purchases",
          d.commission.onPurchases,
          money(summary.commission.purchases),
        ],
        ["sales", d.commission.onSales, money(summary.commission.sales)],
        ["total", d.commission.total, money(summary.commission.total)],
      ]),
      pairs("payments", d.payments.title, [
        [
          "paid-count",
          d.payments.paidCount,
          count(summary.payments.paid.count),
        ],
        ["paid", d.payments.paidAmount, money(summary.payments.paid.amount)],
        [
          "received-count",
          d.payments.receivedCount,
          count(summary.payments.received.count),
        ],
        [
          "received",
          d.payments.receivedAmount,
          money(summary.payments.received.amount),
        ],
      ]),
      pairs("cash", d.cash.title, [
        ["opening", d.cash.opening, money(summary.cash.openingCash)],
        ["in", d.cash.cashIn, money(summary.cash.cashIn)],
        ["out", d.cash.cashOut, money(summary.cash.cashOut)],
        ["closing", d.cash.closing, money(summary.cash.closingCash)],
      ]),
      pairs("cancelled", d.cancelled.title, [
        [
          "purchases",
          d.cancelled.purchases,
          count(summary.cancelled.purchases),
        ],
        ["sales", d.cancelled.sales, count(summary.cancelled.sales)],
        ["payments", d.cancelled.payments, count(summary.cancelled.payments)],
      ]),
      {
        id: "rates",
        title: d.rates.title,
        caption: d.rates.caption,
        layout: "table",
        columns: [
          col("commodity", d.rates.commodity, "text"),
          col("unit", d.rates.unit, "text"),
          col("min", d.rates.min, "money"),
          col("max", d.rates.max, "money"),
          col("avg", d.rates.avg, "money"),
        ],
        rows: summary.rates.map((rate) => {
          const names = commodities.get(rate.commodityId);
          return {
            id: rate.id,
            cells: [
              text(names?.name ?? t.none, { secondary: names?.nameUr ?? null }),
              text(d.rates.units[rate.rateUnit]),
              money(rate.minRate),
              money(rate.maxRate),
              money(rate.avgRate),
            ],
          };
        }),
        totals: null,
        empty: d.rates.empty,
      },
    ],
  };
}
