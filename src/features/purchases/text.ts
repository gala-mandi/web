import type { ChargeType } from "@/lib/charges/calculate-transaction";
import type { PurchaseStatus, RateUnit } from "./types";

/**
 * Every user-facing string of the purchases pages: the entry form, the list,
 * the printable view and the cancel dialog. Kept out of the components so an
 * Urdu version can be added later.
 */

export const purchaseStatusText = {
  draft: "Draft",
  posted: "Saved",
  cancelled: "Cancelled",
} as const satisfies Record<PurchaseStatus, string>;

/** "per maund", next to a rate. */
export const perUnitText = {
  maund: "per maund",
  kg: "per kg",
  bag: "per bag",
} as const satisfies Record<RateUnit, string>;

/** Short unit names for the unit pickers. */
export const unitText = {
  maund: "Maund",
  kg: "Kg",
  bag: "Bag",
} as const satisfies Record<RateUnit, string>;

export const chargeTypeText = {
  commission: "Commission",
  market_fee: "Market fee",
  labour: "Labour",
  other: "Other",
} as const satisfies Record<ChargeType, string>;

const errors = {
  generic: "Something went wrong. Please try again.",
  network:
    "Can’t reach the server, so the purchase may not be saved. Check your internet and press Save again: it won’t be saved twice.",
  dayClosed:
    "This day is closed. Only the owner can change a purchase of a past day.",
  cancelled: "This purchase is cancelled and can’t be changed.",
  alreadyCancelled: "This purchase was already cancelled.",
  forbidden: "You don’t have permission to do this.",
  traderRequired: "Choose a kissan",
  dateRequired: "Enter the date",
  dateInFuture: "A purchase can’t be dated in the future",
  notesTooLong: "Use at most 1000 characters",
  itemsRequired: "Add at least one item",
  tooManyItems: "Use at most 100 items",
  commodityRequired: "Choose a commodity",
  bags: "Enter a whole number of bags",
  bagsTooMany: "Enter at most 1,000,000 bags",
  bagsForBagRate: "Enter the bags for a per-bag rate",
  weightRequired: "Enter the weight",
  weightKg: "Enter the weight in kg (up to 3 decimals)",
  weightMaund: "Enter the weight in maund (up to 6 decimals)",
  weightZero: "Enter a weight above 0",
  weightTooLarge: "The weight is too large",
  rateRequired: "Enter the rate",
  rate: "Enter the rate in rupees (up to 2 decimals)",
  rateZero: "Enter a rate above 0",
} as const;

export const purchaseText = {
  none: "—",
  errors,
  /** "PUR-2026-27-000123" with the kissan, for toasts and dialogs. */
  billOf: (billNo: string) => `Bill ${billNo}`,
  list: {
    newButton: "New purchase",
    caption: "Purchases",
    searchLabel: "Search purchases",
    searchPlaceholder: "Bill number, kissan name or phone…",
    dateLabel: "Date",
    traderLabel: "Kissan",
    traderAll: "All kissans",
    commodityLabel: "Commodity",
    commodityAll: "All commodities",
    statusLabel: "Status",
    statusAll: "All",
    exportFileName: "purchases",
    columns: {
      billNo: "Bill no",
      purchaseDate: "Date",
      trader: "Kissan",
      grossAmount: "Gross",
      totalDeductions: "Deductions",
      netAmount: "Net",
      outstanding: "Outstanding",
      status: "Status",
    },
    empty: {
      title: "No purchases yet",
      body: "Purchases from kissans show here once they’re saved.",
    },
    noMatches: {
      title: "No purchases match",
      body: "Try another search or clear the filters.",
      clear: "Clear filters",
    },
  },
  actions: {
    view: "View",
    edit: "Edit",
    cancel: "Cancel purchase",
    reprint: "Reprint",
  },
  form: {
    newTitle: "New purchase",
    newDescription:
      "Grain bought from a kissan. The total updates as you type.",
    editTitle: (billNo: string) => `Edit ${billNo}`,
    editDescription:
      "Changing the items recalculates the bill and corrects the kissan’s khata.",
    header: "Bill",
    date: "Date",
    trader: "Kissan",
    traderPlaceholder: "Choose a kissan…",
    notes: "Notes",
    notesPlaceholder: "Optional, e.g. truck number",
    items: "Items",
    itemLabel: (n: number) => `Item ${n}`,
    commodity: "Commodity",
    commodityPlaceholder: "Choose…",
    bags: "Bags",
    weight: "Weight",
    weightUnit: "Weight unit",
    rate: "Rate",
    rateUnit: "Rate per",
    amount: "Amount",
    /** Under the weight: "= 1,010 kg (25 mn 10 kg)". */
    weightIs: (kg: string, maund: string) => `= ${kg} (${maund})`,
    todaysRate: "Today’s rate",
    rateChanged: (rate: string) => `Today’s rate is ${rate}`,
    noRateToday: "No rate entered today",
    addItem: "Add item",
    removeItem: (n: number) => `Remove item ${n}`,
    keyboardHint:
      "Enter moves to the next box; Enter on the last rate adds an item. Ctrl+S saves, Ctrl+P saves and prints.",
    save: "Save",
    saveAndPrint: "Save & Print",
    saveAndNew: "Save & New",
    saving: "Saving…",
    cancelEdit: "Discard changes",
    saved: (billNo: string) => `Purchase saved: ${billNo}`,
    updated: (billNo: string) => `Purchase updated: ${billNo}`,
    leaveWarning: "This purchase isn’t saved. Leave and lose it?",
  },
  breakdown: {
    title: "Total",
    gross: "Gross amount",
    /** "Commission 2.50%", "Labour Rs 15.00 per bag", "Other Rs 150.00". */
    charge: (type: ChargeType, basis: string, value: string) =>
      basis === "percent"
        ? `${chargeTypeText[type]} ${value}%`
        : basis === "per_bag"
          ? `${chargeTypeText[type]} ${value} per bag`
          : `${chargeTypeText[type]} ${value}`,
    totalDeductions: "Total deductions",
    rounding: "Rounding",
    net: "Net payable to kissan",
    paid: "Paid now",
    empty: "Add an item with weight and rate to see the total.",
    /** Why the calculator can't total the bill (the server refuses it too). */
    reasons: {
      itemChargesOverGross: (n: number) =>
        `Can’t total this bill: the charges of item ${n} are more than its amount.`,
      deductionsOverGross:
        "Can’t total this bill: the deductions are more than the gross amount.",
      netZero: "Can’t total this bill: the net amount comes to Rs 0.",
      tooLarge: "Can’t total this bill: an amount is too large.",
      other: "Can’t total this bill. Check the weights and rates.",
    },
    preview: "Live preview; the saved bill is calculated by the server.",
  },
  view: {
    back: "All purchases",
    outstanding: "Outstanding",
    loading: "Loading purchase…",
    error: {
      title: "Couldn’t load this purchase",
      body: "Check your internet and try again.",
      retry: "Try again",
    },
    billNo: "Bill no",
    date: "Date",
    trader: "Kissan",
    status: "Status",
    notes: "Notes",
    items: "Items",
    cancelledNote:
      "This purchase is cancelled. Its khata entries were reversed.",
    khataLink: "Open kissan’s khata",
  },
  cancel: {
    title: (billNo: string) => `Cancel ${billNo}?`,
    body: "The kissan’s khata entries are reversed. The bill number is kept and never used again. This can’t be undone.",
    keep: "Keep purchase",
    confirm: "Cancel purchase",
    pending: "Cancelling…",
    done: (billNo: string) => `${billNo} cancelled`,
  },
} as const;
