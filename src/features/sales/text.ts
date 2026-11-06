import { purchaseText } from "@/features/purchases/text";
import type { ChargeType } from "@/lib/charges/calculate-transaction";

/**
 * Every user-facing string of the sales pages: the entry form, the list,
 * the printable view and the cancel dialog. The item rows, units, statuses
 * and save buttons are shared with purchases (`purchaseText`). Kept out of
 * the components so an Urdu version can be added later.
 */

const errors = {
  generic: purchaseText.errors.generic,
  network:
    "Can’t reach the server, so the sale may not be saved. Check your internet and press Save again: it won’t be saved twice.",
  dayClosed:
    "This day is closed. Only the owner can change a sale of a past day.",
  cancelled: "This sale is cancelled and can’t be changed.",
  alreadyCancelled: "This sale was already cancelled.",
  forbidden: purchaseText.errors.forbidden,
  buyerRequired: "Choose a beopari",
  dateRequired: purchaseText.errors.dateRequired,
  dateInFuture: "A sale can’t be dated in the future",
  notesTooLong: purchaseText.errors.notesTooLong,
  itemsRequired: purchaseText.errors.itemsRequired,
  tooManyItems: purchaseText.errors.tooManyItems,
} as const;

export const saleText = {
  none: purchaseText.none,
  errors,
  billOf: purchaseText.billOf,
  list: {
    newButton: "New sale",
    caption: "Sales",
    searchLabel: "Search sales",
    searchPlaceholder: "Bill number, beopari name or phone…",
    dateLabel: "Date",
    buyerLabel: "Beopari",
    buyerAll: "All beoparis",
    commodityLabel: "Commodity",
    commodityAll: "All commodities",
    statusLabel: "Status",
    statusAll: "All",
    exportFileName: "sales",
    columns: {
      billNo: "Bill no",
      saleDate: "Date",
      buyer: "Beopari",
      grossAmount: "Gross",
      totalCharges: "Charges",
      netAmount: "Net",
      status: "Status",
    },
    empty: {
      title: "No sales yet",
      body: "Sales to beoparis show here once they’re saved.",
    },
    noMatches: {
      title: "No sales match",
      body: "Try another search or clear the filters.",
      clear: "Clear filters",
    },
  },
  actions: {
    view: "View",
    edit: "Edit",
    cancel: "Cancel sale",
    reprint: "Reprint",
  },
  form: {
    newTitle: "New sale",
    newDescription: "Grain sold to a beopari. The total updates as you type.",
    editTitle: (billNo: string) => `Edit ${billNo}`,
    editDescription:
      "Changing the items recalculates the bill and corrects the beopari’s khata.",
    buyer: "Beopari",
    buyerPlaceholder: "Choose a beopari…",
    saved: (billNo: string) => `Sale saved: ${billNo}`,
    updated: (billNo: string) => `Sale updated: ${billNo}`,
    leaveWarning: "This sale isn’t saved. Leave and lose it?",
  },
  /** Next to the beopari: their khata balance and credit limit. */
  buyer: {
    loading: "Loading balance…",
    error: "Couldn’t load the balance.",
    balance: "Balance",
    creditLimit: "Credit limit",
    noLimit: "No limit",
    receivable: "receivable",
    payable: "payable",
    settled: "settled",
  },
  /** The warning before saving, from the balance and this sale's net. */
  credit: {
    title: "Over the credit limit",
    body: (name: string, owed: string, limit: string) =>
      `After this sale ${name} would owe ${owed}, above the credit limit of ${limit}. You can still save if the shop allows it.`,
    /** After a save the shop allowed (setting "warn"). */
    savedOver: "Saved over the credit limit",
  },
  breakdown: {
    title: purchaseText.breakdown.title,
    gross: purchaseText.breakdown.gross,
    /** "Commission 2.50%", "Labour Rs 15.00 per bag". */
    charge: (type: ChargeType, basis: string, value: string) =>
      purchaseText.breakdown.charge(type, basis, value),
    totalCharges: "Total charges",
    rounding: purchaseText.breakdown.rounding,
    net: "Net receivable from beopari",
    received: "Received now",
    empty: purchaseText.breakdown.empty,
    reasons: {
      netZero: purchaseText.breakdown.reasons.netZero,
      tooLarge: purchaseText.breakdown.reasons.tooLarge,
      other: purchaseText.breakdown.reasons.other,
    },
    preview: purchaseText.breakdown.preview,
  },
  view: {
    back: "All sales",
    loading: "Loading sale…",
    error: {
      title: "Couldn’t load this sale",
      body: "Check your internet and try again.",
      retry: "Try again",
    },
    buyer: "Beopari",
    cancelledNote: "This sale is cancelled. Its khata entries were reversed.",
    khataLink: "Open beopari’s khata",
  },
  cancel: {
    title: (billNo: string) => `Cancel ${billNo}?`,
    body: "The beopari’s khata entries are reversed. The bill number is kept and never used again. This can’t be undone.",
    keep: "Keep sale",
    confirm: "Cancel sale",
    pending: "Cancelling…",
    done: (billNo: string) => `${billNo} cancelled`,
  },
} as const;
