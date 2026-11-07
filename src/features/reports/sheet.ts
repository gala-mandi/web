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
import type { CashBook } from "@/features/payments/types";
import type { Locale } from "@/i18n/config";
import type { Translator } from "@/i18n/types";
import { formatDate, karachiToday } from "@/lib/format";
import { ledgerRoutes, type ReportSlug } from "@/lib/routes";

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

/**
 * The words and language a sheet is written in: the interface language on
 * screen, print, PDF and Excel.
 */
export interface SheetWords {
  t: Translator<"reports">;
  tp: Translator<"payments">;
  locale: Locale;
}

const pairColumns = (t: SheetWords["t"]) => [
  col("item", t("document.item"), "text"),
  col("value", t("document.value"), "text"),
];

/** "1 Nov 2026 – 6 Nov 2026"; one day is shown once. */
function rangeOf({ t, locale }: SheetWords, from: string, to: string) {
  const day = (value: string) => formatDate(value, locale);
  return {
    period:
      from === to
        ? day(from)
        : t("range.period", { from: day(from), to: day(to) }),
    periodKey: from === to ? from : `${from}_${to}`,
  };
}

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
  w: SheetWords,
  kind: BookKind,
  report: PurchasesReport | SalesReport,
  ctx: BookSheetContext = {},
): ReportSheet {
  const { t, locale } = w;
  const charges = (m: object): string | null =>
    kind === "purchases"
      ? (m as PurchasesReport["totals"]).totalDeductions
      : (m as SalesReport["totals"]).totalCharges;
  // Bill-level amounts are null when bills are split by commodity.
  const billLevel = report.totals.netAmount !== null;
  const group = report.groupBy;
  const groupLabel =
    group === "trader"
      ? t(`book.group.trader.${kind}`)
      : t(`book.group.${group as "day"}`);

  const columns = [
    col("group", groupLabel, group === "day" ? "date" : "text"),
    col("bills", t("book.bills"), "count"),
    col("bags", t("book.bags"), "count"),
    col("weight", t("book.weight"), "kg"),
    col("gross", t("book.gross"), "money"),
    ...(billLevel
      ? [
          col(
            "charges",
            kind === "purchases" ? t("book.deductions") : t("book.charges"),
            "money",
          ),
          col("net", t("book.net"), "money"),
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
      hrefLabel: t("outstanding.openKhata", { name: label }),
    });
  };

  const filters: [string, string][] = [
    [t("filters.groupBy"), t(`filters.groups.${group as ReportGroup}`)],
  ];
  if (ctx.commodityName)
    filters.push([t("filters.commodity"), ctx.commodityName]);
  if (ctx.traderName) {
    filters.push([
      kind === "purchases" ? t("filters.kissan") : t("filters.beopari"),
      ctx.traderName,
    ]);
  }

  return {
    slug: kind,
    title: t("documentTitle", { title: t(`reports.${kind}.title`) }),
    ...rangeOf(w, report.from, report.to),
    filters,
    tables: [
      {
        id: kind,
        caption: t("book.caption", { title: t(`reports.${kind}.title`) }),
        layout: "table",
        columns,
        rows: report.rows.map((row) => ({
          id: row.key,
          cells: [groupCell(row.key, row.label), ...metrics(row)],
        })),
        totals: [text(t("total")), ...metrics(report.totals)],
        empty: t(`book.empty.${kind}`),
        note: billLevel ? undefined : t("book.perBillNote"),
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
export function commissionSheet(
  w: SheetWords,
  report: CommissionReport,
): ReportSheet {
  const { t } = w;
  return {
    slug: "commission",
    title: t("documentTitle", { title: t("reports.commission.title") }),
    ...rangeOf(w, report.from, report.to),
    filters: [],
    tables: [
      {
        id: "commission",
        title: t("commission.title"),
        caption: t("commission.caption"),
        layout: "table",
        columns: [
          col("date", t("commission.date"), "date"),
          col("purchases", t("commission.onPurchases"), "money"),
          col("sales", t("commission.onSales"), "money"),
          col("total", t("commission.total"), "money"),
        ],
        rows: report.days.map((day) => ({
          id: day.date,
          cells: [date(day.date), ...sides(day)],
        })),
        totals: [text(t("total")), ...sides(report.totals)],
        empty: t("commission.empty"),
      },
      {
        id: "other-charges",
        title: t("commission.other.title"),
        caption: t("commission.other.caption"),
        layout: "table",
        columns: [
          col("charge", t("commission.other.charge"), "text"),
          col("purchases", t("commission.onPurchases"), "money"),
          col("sales", t("commission.onSales"), "money"),
          col("total", t("commission.total"), "money"),
        ],
        rows: (
          [
            ["marketFee", t("commission.other.marketFee")],
            ["labour", t("commission.other.labour")],
            ["other", t("commission.other.other")],
          ] as const
        ).map(([id, label]) => ({
          id,
          cells: [text(label), ...sides(report.otherCharges[id])],
        })),
        totals: null,
        note: t("commission.otherNote"),
      },
    ],
  };
}

/* ------------------------------------------------------------------ */

function outstandingTable(
  t: SheetWords["t"],
  id: "receivable" | "payable",
  side: OutstandingSide,
): ReportTable {
  return {
    id,
    title: t(`outstanding.${id}.title`),
    caption: t(`outstanding.${id}.caption`),
    layout: "table",
    columns: [
      col("trader", t("outstanding.trader"), "text"),
      col("type", t("outstanding.type"), "text"),
      col("phone", t("outstanding.phone"), "text"),
      col("amount", t("outstanding.amount"), "money"),
    ],
    rows: side.traders.map((trader) => ({
      id: trader.traderId,
      cells: [
        text(trader.name, {
          href: ledgerRoutes.khata(trader.traderId),
          hrefLabel: t("outstanding.openKhata", { name: trader.name }),
        }),
        text(t(`traderTypes.${trader.type}`)),
        text(trader.phone ?? ""),
        money(trader.amount),
      ],
    })),
    totals: [
      text(t("totalOf", { what: t("traders", { n: side.count }) })),
      text(""),
      text(""),
      money(side.total),
    ],
    empty: t(`outstanding.${id}.empty`),
  };
}

/** Receivable and payable, each with the server's total. */
export function outstandingSheet(
  w: SheetWords,
  report: OutstandingReport,
  typeFilter?: string | null,
): ReportSheet {
  const { t, locale } = w;
  return {
    slug: "outstanding",
    title: t("documentTitle", { title: t("reports.outstanding.title") }),
    period: report.asOf
      ? t("asOf.period", { day: formatDate(report.asOf, locale) })
      : t("asOf.periodNow"),
    // "Up to now" is saved under today's date.
    periodKey: report.asOf ?? karachiToday(),
    filters: typeFilter ? [[t("filters.traderType"), typeFilter]] : [],
    tables: [
      outstandingTable(t, "receivable", report.receivable),
      outstandingTable(t, "payable", report.payable),
    ],
  };
}

/* ------------------------------------------------------------------ */

/**
 * The cash book's days; each day opens with the day before's closing (the
 * first with the opening cash), as on screen. Totals: the server's.
 */
export function cashBookSheet(w: SheetWords, book: CashBook): ReportSheet {
  const { t, tp } = w;
  // The same headings as the cash book's own table.
  return {
    slug: "cash-book",
    title: t("documentTitle", { title: t("reports.cash-book.title") }),
    ...rangeOf(w, book.from, book.to),
    filters: [],
    tables: [
      {
        id: "cash-book",
        title: t("cashBook.title"),
        caption: t("cashBook.title"),
        layout: "table",
        columns: [
          col("date", tp("cashBook.days.date"), "date"),
          col("opening", tp("cashBook.days.opening"), "money"),
          col("cashIn", tp("cashBook.days.cashIn"), "money"),
          col("cashOut", tp("cashBook.days.cashOut"), "money"),
          col("closing", tp("cashBook.days.closing"), "money"),
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
          text(t("total")),
          money(book.openingCash),
          money(book.totals.cashIn),
          money(book.totals.cashOut),
          money(book.closingCash),
        ],
        empty: tp("cashBook.days.empty"),
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
  w: SheetWords,
  summary: DailySummary,
  commodities: ReadonlyMap<string, CommodityNames> = new Map(),
): ReportSheet {
  const { t, locale } = w;
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
    columns: pairColumns(t),
    rows: rows.map(([rowId, label, value]) => pair(rowId, label, value)),
    totals: null,
  });

  return {
    slug: "daily-summary",
    title: t("documentTitle", { title: t("reports.daily-summary.title") }),
    period: formatDate(summary.date, locale),
    periodKey: summary.date,
    filters: [],
    tables: [
      pairs("purchases", t("daily.purchases.title"), [
        ["bills", t("daily.purchases.bills"), count(p.bills)],
        ["bags", t("daily.purchases.bags"), count(p.bags)],
        ["weight", t("daily.purchases.weight"), kg(p.weightKg)],
        ["gross", t("daily.purchases.gross"), money(p.grossAmount)],
        [
          "deductions",
          t("daily.purchases.deductions"),
          money(p.totalDeductions),
        ],
        ["net", t("daily.purchases.net"), money(p.netAmount)],
        ["paid", t("daily.purchases.paidOnBills"), money(p.paidOnBills)],
      ]),
      pairs("sales", t("daily.sales.title"), [
        ["bills", t("daily.sales.bills"), count(s.bills)],
        ["bags", t("daily.sales.bags"), count(s.bags)],
        ["weight", t("daily.sales.weight"), kg(s.weightKg)],
        ["gross", t("daily.sales.gross"), money(s.grossAmount)],
        ["charges", t("daily.sales.charges"), money(s.totalCharges)],
        ["net", t("daily.sales.net"), money(s.netAmount)],
        [
          "received",
          t("daily.sales.receivedOnBills"),
          money(s.receivedOnBills),
        ],
      ]),
      pairs("commission", t("daily.commission.title"), [
        [
          "purchases",
          t("daily.commission.onPurchases"),
          money(summary.commission.purchases),
        ],
        [
          "sales",
          t("daily.commission.onSales"),
          money(summary.commission.sales),
        ],
        ["total", t("daily.commission.total"), money(summary.commission.total)],
      ]),
      pairs("payments", t("daily.payments.title"), [
        [
          "paid-count",
          t("daily.payments.paidCount"),
          count(summary.payments.paid.count),
        ],
        [
          "paid",
          t("daily.payments.paidAmount"),
          money(summary.payments.paid.amount),
        ],
        [
          "received-count",
          t("daily.payments.receivedCount"),
          count(summary.payments.received.count),
        ],
        [
          "received",
          t("daily.payments.receivedAmount"),
          money(summary.payments.received.amount),
        ],
      ]),
      pairs("cash", t("daily.cash.title"), [
        ["opening", t("daily.cash.opening"), money(summary.cash.openingCash)],
        ["in", t("daily.cash.cashIn"), money(summary.cash.cashIn)],
        ["out", t("daily.cash.cashOut"), money(summary.cash.cashOut)],
        ["closing", t("daily.cash.closing"), money(summary.cash.closingCash)],
      ]),
      pairs("cancelled", t("daily.cancelled.title"), [
        [
          "purchases",
          t("daily.cancelled.purchases"),
          count(summary.cancelled.purchases),
        ],
        ["sales", t("daily.cancelled.sales"), count(summary.cancelled.sales)],
        [
          "payments",
          t("daily.cancelled.payments"),
          count(summary.cancelled.payments),
        ],
      ]),
      {
        id: "rates",
        title: t("daily.rates.title"),
        caption: t("daily.rates.caption"),
        layout: "table",
        columns: [
          col("commodity", t("daily.rates.commodity"), "text"),
          col("unit", t("daily.rates.unit"), "text"),
          col("min", t("daily.rates.min"), "money"),
          col("max", t("daily.rates.max"), "money"),
          col("avg", t("daily.rates.avg"), "money"),
        ],
        rows: summary.rates.map((rate) => {
          const names = commodities.get(rate.commodityId);
          return {
            id: rate.id,
            cells: [
              text(names?.name ?? t("none"), {
                secondary: names?.nameUr ?? null,
              }),
              text(t(`daily.rates.units.${rate.rateUnit}`)),
              money(rate.minRate),
              money(rate.maxRate),
              money(rate.avgRate),
            ],
          };
        }),
        totals: null,
        empty: t("daily.rates.empty"),
      },
    ],
  };
}
