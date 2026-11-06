import type { RateUnit } from "@/features/rates/types";

/**
 * Every user-facing string of the dashboard. Kept out of the components so an
 * Urdu version can be added later.
 */

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString("en-PK")} ${n === 1 ? one : many}`;

export const dashboardText = {
  bills: (n: number) => plural(n, "bill", "bills"),
  bags: (n: number) => plural(n, "bag", "bags"),
  traders: (n: number) => plural(n, "trader", "traders"),
  /** "Today, 6 Nov 2026" (the date comes formatted). */
  today: (date: string) => `Today, ${date}`,
  /** "Updated 3:05 pm" (the time comes formatted). */
  updated: (time: string) => `Updated ${time}`,
  refreshing: "Refreshing…",
  autoRefresh: "Refreshes every 3 minutes",
  loading: "Loading…",
  retry: "Try again",
  tiles: {
    label: "Today’s position",
    error: "Couldn’t load today’s figures. Check your internet and try again.",
    purchases: {
      title: "Purchases",
      hint: (bills: string, bags: string) => `${bills} · ${bags}`,
    },
    sales: {
      title: "Sales",
      hint: (bills: string, bags: string) => `${bills} · ${bags}`,
    },
    commission: {
      title: "Commission",
      hint: (purchases: string, sales: string) =>
        `Purchases ${purchases} · Sales ${sales}`,
    },
    cash: {
      title: "Cash in hand",
      hint: (cashIn: string, cashOut: string) =>
        `In ${cashIn} · Out ${cashOut}`,
    },
  },
  trend: {
    title: "Purchases vs sales",
    description: "Net amount of posted bills per day, last 30 days.",
    purchases: "Purchases",
    sales: "Sales",
    /** Legend chip: "Purchases" + the period total. */
    total: "30-day total",
    chartLabel: (purchases: string, sales: string) =>
      `Purchases vs sales, last 30 days. Purchases ${purchases}, sales ${sales}.`,
    noBills: "No bills",
    empty: "No purchases or sales in the last 30 days.",
    error: "Couldn’t load the last 30 days. Check your internet and try again.",
  },
  rates: {
    title: "Rates of top commodities",
    description: "Most traded in the last 30 days: min–max band and average.",
    unit: {
      maund: "/ maund",
      kg: "/ kg",
    } satisfies Record<RateUnit, string>,
    /** "Latest 6 Nov" (the date comes formatted). */
    latest: (date: string) => `Latest ${date}`,
    range: (min: string, max: string) => `${min} – ${max}`,
    chartLabel: (name: string) => `${name} rate, last 30 days`,
    min: "Min",
    max: "Max",
    avg: "Avg",
    none: "—",
    noRate: "No rate saved",
    noRates: "No rates saved in the last 30 days.",
    empty: "Rates show here once your shop has bills in the last 30 days.",
    error: "Couldn’t load the rates. Check your internet and try again.",
  },
  outstanding: {
    /** "Top 10 of 24 traders" */
    shown: (shown: number, count: string) => `Top ${shown} of ${count}`,
    openKhata: (name: string) => `Open ${name}’s khata`,
    error: "Couldn’t load the balances. Check your internet and try again.",
    receivable: {
      title: "Top receivables",
      description: "Traders who owe you, largest first.",
      total: "Total receivable",
      empty: "No one owes you money.",
    },
    payable: {
      title: "Top payables",
      description: "Traders you owe, largest first.",
      total: "Total payable",
      empty: "You owe no one.",
    },
  },
  empty: {
    title: "Your dashboard is ready",
    body: "It fills in as you work. Start with today’s rates and your first bill; the figures update by themselves every few minutes.",
    steps: "Get started",
    setRates: "Set today’s rates",
    seeRates: "See today’s rates",
    purchase: "Add your first purchase",
    sale: "Add your first sale",
  },
  operator: {
    tilesLabel: "Today’s work",
    purchases: "Purchases today",
    sales: "Sales today",
    postedHint: "Posted bills",
    error: "Couldn’t load today’s bills. Check your internet and try again.",
    rates: {
      title: "Today’s rates",
      description: "Per commodity, as saved on the Daily rates page.",
      empty: "No rates saved for today yet.",
    },
    empty: {
      title: "Nothing entered today yet",
      body: "Today’s bills and rates show here as soon as they are saved.",
      purchase: "New purchase",
      sale: "New sale",
    },
  },
} as const;
