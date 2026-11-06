import type { ReportGroup } from "@/features/dashboard/types";
import type { TraderType } from "@/features/traders/types";
import type { ReportSlug } from "@/lib/routes";
import type { RangePreset } from "./range";

/**
 * Every user-facing string of the Reports pages, their print / PDF layout
 * and their Excel files. Kept out of the components so an Urdu version can
 * be added later (ticket 35).
 */

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString("en-PK")} ${n === 1 ? one : many}`;

export const reportText = {
  none: "—",
  total: "Total",
  retry: "Try again",
  loading: "Loading the report…",
  bills: (n: number) => plural(n, "bill", "bills"),
  bags: (n: number) => plural(n, "bag", "bags"),
  traders: (n: number) => plural(n, "trader", "traders"),
  vouchers: (n: number) => plural(n, "voucher", "vouchers"),
  /** "Total · 24 traders" */
  totalOf: (what: string) => `Total · ${what}`,

  hub: {
    title: "Reports",
    description:
      "Daily, purchase, sale, commission, outstanding and cash reports. Each one prints and exports to Excel or PDF.",
    open: (title: string) => `Open the ${title} report`,
  },

  /** Title and one line for each report (hub cards, page headers, files). */
  reports: {
    "daily-summary": {
      title: "Daily summary",
      description:
        "One day at a glance: bills, commission, vouchers, the cash book and rates.",
      file: "daily-summary",
    },
    purchases: {
      title: "Purchases",
      description:
        "Grain bought from kissans, by day, commodity or kissan, with deductions and net.",
      file: "purchases-report",
    },
    sales: {
      title: "Sales",
      description:
        "Grain sold to beoparis, by day, commodity or beopari, with charges and net.",
      file: "sales-report",
    },
    commission: {
      title: "Commission",
      description:
        "The shop’s commission income per day, with market fee and labour shown apart.",
      file: "commission-report",
    },
    outstanding: {
      title: "Outstanding",
      description:
        "Who owes the shop and whom the shop owes, from the khata, largest first.",
      file: "outstanding-report",
    },
    "cash-book": {
      title: "Cash book",
      description:
        "Opening cash, cash received and paid each day, and the cash in hand.",
      file: "cash-book",
    },
  } satisfies Record<
    ReportSlug,
    { title: string; description: string; file: string }
  >,

  /** "Purchases report" on the print, PDF and Excel. */
  documentTitle: (title: string) => `${title} report`,

  range: {
    label: "Dates",
    presetsLabel: "Date range",
    presets: {
      today: "Today",
      week: "This week",
      month: "This month",
      custom: "Custom",
    } satisfies Record<RangePreset, string>,
    /** "1 Nov 2026 – 6 Nov 2026"; one day is shown once. */
    period: (from: string, to: string) =>
      from === to ? from : `${from} – ${to}`,
    tooLong: (days: number) => `Choose at most ${days} days.`,
  },

  day: {
    label: "Date",
    previous: "Previous day",
    next: "Next day",
    today: "Today",
  },

  asOf: {
    label: "Balances at the end of",
    now: "Now",
    /** Period line of the outstanding report. */
    period: (day: string | null) =>
      day ? `At the end of ${day}` : "Up to now",
  },

  filters: {
    groupBy: "Group by",
    groups: {
      day: "Day",
      commodity: "Commodity",
      trader: "Trader",
    } satisfies Record<ReportGroup, string>,
    commodity: "Commodity",
    allCommodities: "All commodities",
    kissan: "Kissan",
    beopari: "Beopari",
    allKissans: "All kissans",
    allBeoparis: "All beoparis",
    traderType: "Trader type",
    allTypes: "All types",
    clear: "Clear filters",
  },

  traderTypes: {
    kissan: "Kissan",
    beopari: "Beopari",
    arhti: "Arhti",
  } satisfies Record<TraderType, string>,

  actions: {
    label: "Report actions",
    print: "Print",
    excel: "Excel",
    pdf: "PDF",
    preparing: "Preparing…",
    pdfHint: "Choose “Save as PDF” as the printer to save the report.",
    failed: "Couldn’t prepare the report. Try again.",
  },

  document: {
    shop: "Shop",
    period: "Period",
    printedOn: "Printed on",
    page: "Page",
    of: "of",
    /** Excel header suffixes, so the units show in the column titles. */
    rupees: "(Rs)",
    kg: "(kg)",
    item: "Item",
    value: "Value",
  },

  error: {
    title: "Couldn’t load the report",
    body: "Check your internet and try again.",
  },

  cards: {
    bills: "Bills",
    weight: "Weight",
    gross: "Gross amount",
    net: "Net amount",
    deductions: "Deductions",
    charges: "Charges",
    commission: "Commission",
    commissionHint: "The shop’s income for these dates",
    onPurchases: "On purchases",
    onSales: "On sales",
    receivable: "Receivable",
    payable: "Payable",
    cashInHand: "Cash in hand",
    /** "13 bills · 546 bags" parts. */
    netHint: {
      purchases: "Owed to kissans",
      sales: "Owed by beoparis",
    },
    bagsHint: (bags: number) => `${bags.toLocaleString("en-PK")} bags`,
    perBill: "Not split by commodity",
    receivableHint: "Traders who owe the shop",
    payableHint: "Traders the shop owes",
  },

  book: {
    caption: (title: string) => `${title} by group`,
    group: {
      day: "Date",
      commodity: "Commodity",
      trader: { purchases: "Kissan", sales: "Beopari" },
    },
    bills: "Bills",
    bags: "Bags",
    weight: "Weight",
    gross: "Gross",
    deductions: "Deductions",
    charges: "Charges",
    net: "Net",
    empty: {
      purchases: "No posted purchases on these dates.",
      sales: "No posted sales on these dates.",
    },
    perBillNote:
      "Deductions, charges and net are worked out per bill, so they are left out when bills are split by commodity.",
  },

  commission: {
    title: "Commission per day",
    caption: "Commission per day",
    date: "Date",
    onPurchases: "On purchases",
    onSales: "On sales",
    total: "Total",
    empty: "No commission on these dates.",
    other: {
      title: "Other charges (not shop income)",
      caption: "Other charges of the same bills",
      charge: "Charge",
      marketFee: "Market fee",
      labour: "Labour",
      other: "Other",
    },
    otherNote:
      "Market fee goes to the market committee and labour to the labourers; they are not the shop’s income.",
  },

  outstanding: {
    receivable: {
      title: "Receivable",
      caption: "Traders who owe the shop",
      empty: "No one owes the shop money.",
    },
    payable: {
      title: "Payable",
      caption: "Traders the shop owes",
      empty: "The shop owes no one.",
    },
    trader: "Trader",
    type: "Type",
    phone: "Phone",
    amount: "Amount",
    openKhata: (name: string) => `Open ${name}’s khata`,
  },

  cashBook: {
    title: "Cash in and out each day",
    vouchers: "See the cash vouchers",
  },

  daily: {
    purchases: {
      title: "Purchases",
      bills: "Bills",
      bags: "Bags",
      weight: "Weight",
      gross: "Gross amount",
      deductions: "Deductions",
      net: "Net (owed to kissans)",
      paidOnBills: "Paid on the bills",
    },
    sales: {
      title: "Sales",
      bills: "Bills",
      bags: "Bags",
      weight: "Weight",
      gross: "Gross amount",
      charges: "Charges",
      net: "Net (owed by beoparis)",
      receivedOnBills: "Received on the bills",
    },
    commission: {
      title: "Commission",
      onPurchases: "On purchases",
      onSales: "On sales",
      total: "Total",
    },
    payments: {
      title: "Vouchers",
      paidCount: "Payments to kissans",
      paidAmount: "Paid",
      receivedCount: "Receipts from beoparis",
      receivedAmount: "Received",
    },
    cash: {
      title: "Cash book",
      opening: "Opening cash",
      cashIn: "Cash in",
      cashOut: "Cash out",
      closing: "Cash in hand",
    },
    cancelled: {
      title: "Cancelled (left out of every total)",
      purchases: "Purchases",
      sales: "Sales",
      payments: "Vouchers",
    },
    rates: {
      title: "Rates of the day",
      caption: "Rates of the day",
      commodity: "Commodity",
      unit: "Per",
      min: "Min",
      max: "Max",
      avg: "Avg",
      units: { maund: "Maund", kg: "kg" },
      empty: "No rates saved for this day.",
    },
  },
} as const;
