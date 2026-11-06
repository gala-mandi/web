import { purchaseText } from "@/features/purchases/text";
import type { PaymentDirection, PaymentMethod } from "./types";

/**
 * Every user-facing string of the payments pages: the voucher form with
 * its bill allocation, the voucher view, the cancel dialog and the cash
 * book. The printed voucher's English and Urdu words are in
 * `voucher-words.ts`. Kept out of the components so an Urdu version of the
 * screens can be added later.
 */

const errors = {
  generic: purchaseText.errors.generic,
  network:
    "Can’t reach the server, so the voucher may not be saved. Check your internet and press Save again: it won’t be saved twice.",
  forbidden: purchaseText.errors.forbidden,
  alreadyCancelled: "This voucher was already cancelled.",
  dateRequired: purchaseText.errors.dateRequired,
  dateInFuture: "A voucher can’t be dated in the future",
  traderRequired: {
    paid: "Choose a kissan",
    received: "Choose a beopari",
  } satisfies Record<PaymentDirection, string>,
  amountRequired: "Enter the amount",
  amount: "Enter an amount in rupees (up to 2 decimals)",
  amountZero: "Enter an amount above 0",
  /** The bills take more than the amount. */
  amountBelowBills: (allocated: string) =>
    `The bills take ${allocated}; enter at least that, or lower a bill`,
  share: "Enter rupees (up to 2 decimals)",
  shareOverBill: (left: string) => `Only ${left} is left on this bill`,
  referenceTooLong: "Use at most 80 characters",
  notesTooLong: purchaseText.errors.notesTooLong,
} as const;

export const directionText = {
  paid: "Payment",
  received: "Receipt",
} as const satisfies Record<PaymentDirection, string>;

export const methodText = {
  cash: "Cash",
  bank: "Bank",
  cheque: "Cheque",
  online: "Online",
} as const satisfies Record<PaymentMethod, string>;

export const paymentText = {
  errors,
  /** "Payment PAY-…" / "Receipt RCT-…". */
  voucherOf: (direction: PaymentDirection, voucherNo: string) =>
    `${directionText[direction]} ${voucherNo}`,
  form: {
    newTitle: {
      paid: "Pay a kissan",
      received: "Receive from a beopari",
    } satisfies Record<PaymentDirection, string>,
    newDescription: {
      paid: "Money paid to a kissan. It settles his oldest purchase bills first; the rest stays as peshgi.",
      received:
        "Money received from a beopari. It settles his oldest sale bills first; the rest stays as an advance.",
    } satisfies Record<PaymentDirection, string>,
    directionLabel: "Voucher type",
    direction: {
      paid: "Pay kissan",
      received: "Receive from beopari",
    } satisfies Record<PaymentDirection, string>,
    header: "Voucher",
    date: "Date",
    trader: { paid: "Kissan", received: "Beopari" } satisfies Record<
      PaymentDirection,
      string
    >,
    traderPlaceholder: {
      paid: "Choose a kissan…",
      received: "Choose a beopari…",
    } satisfies Record<PaymentDirection, string>,
    amount: "Amount (Rs)",
    amountPlaceholder: "0",
    method: "Paid by",
    methodReceived: "Received by",
    reference: "Reference",
    referenceHint: "Cheque number, bank or transfer reference (optional)",
    notes: purchaseText.form.notes,
    notesPlaceholder: purchaseText.form.notesPlaceholder,
    saved: (direction: PaymentDirection, voucherNo: string) =>
      `${directionText[direction]} saved: ${voucherNo}`,
    leaveWarning: "This voucher isn’t saved. Leave and lose it?",
  },
  /** Next to the trader: their khata balance. */
  balance: {
    loading: "Loading balance…",
    error: "Couldn’t load the balance.",
    label: "Khata balance",
    receivable: "receivable",
    payable: "payable",
    settled: "settled",
  },
  /** The trader's outstanding bills and how the amount settles them. */
  bills: {
    title: "Outstanding bills",
    description: {
      paid: "Purchases from this kissan that aren’t fully paid, oldest first.",
      received:
        "Sales to this beopari that aren’t fully received, oldest first.",
    } satisfies Record<PaymentDirection, string>,
    pickTrader: {
      paid: "Choose a kissan to see his outstanding bills.",
      received: "Choose a beopari to see his outstanding bills.",
    } satisfies Record<PaymentDirection, string>,
    loading: "Loading bills…",
    error: "Couldn’t load the bills.",
    retry: "Try again",
    none: {
      title: "No outstanding bills",
      body: "Every bill is settled. The whole amount is kept as an advance (peshgi).",
    },
    more: "Showing the open bills among this trader’s latest 100.",
    caption: "Outstanding bills and the amount each one takes",
    columns: {
      billNo: "Bill no",
      date: "Date",
      net: "Net",
      outstanding: "Outstanding",
      allocate: "Allocate",
      left: "Left after",
    },
    /** The accessible name of a bill's amount input. */
    allocateLabel: (billNo: string) => `Allocate to ${billNo}`,
    total: "Total",
    settled: "Settled",
    part: "Part",
    auto: "Auto-allocated, oldest first",
    autoHint: "Type in a row to change the split by hand.",
    manual: "Split by hand",
    manualHint: "The amount no bill takes stays as an advance.",
    autoButton: "Auto-allocate oldest first",
    clearButton: "Clear all",
  },
  summary: {
    title: "Summary",
    amount: "Amount",
    allocated: "To bills",
    advance: "Advance (peshgi)",
    over: "More than the amount",
    preview:
      "A preview: the server settles the bills when you save and prints the voucher with its numbers.",
  },
  /** After a save the shop allowed (setting "advance"). */
  overpayment: {
    saved: "Saved with an advance",
  },
  actions: {
    cancel: "Cancel voucher",
    print: "Print voucher",
  },
  view: {
    back: "Cash book",
    loading: "Loading voucher…",
    error: {
      title: "Couldn’t load this voucher",
      body: "Check your internet and try again.",
      retry: "Try again",
    },
    cancelledNote:
      "This voucher is cancelled. Its khata entry was reversed and the bills it settled are open again.",
    khataLink: "Open khata",
    preview: (voucherNo: string) => `Voucher ${voucherNo}`,
  },
  cancel: {
    title: (voucherNo: string) => `Cancel ${voucherNo}?`,
    body: "The trader’s khata entry is reversed and the bills it settled are open again. The voucher number is kept and never used again. This can’t be undone.",
    keep: "Keep voucher",
    confirm: "Cancel voucher",
    pending: "Cancelling…",
    done: (voucherNo: string) => `${voucherNo} cancelled`,
  },
  cashBook: {
    title: "Cash book",
    description:
      "Cash received and paid each day, and the cash that should be in hand. Count the drawer against “Cash in hand”.",
    payButton: "Pay kissan",
    receiveButton: "Receive from beopari",
    datesLabel: "Dates",
    previousDay: "Previous day",
    nextDay: "Next day",
    today: "Today",
    loading: "Loading the cash book…",
    error: {
      title: "Couldn’t load the cash book",
      body: "Check your internet and try again.",
      retry: "Try again",
    },
    opening: "Opening cash",
    openingHint: "In hand before the first day",
    cashIn: "Cash in",
    cashInHint: "Received from beoparis",
    cashOut: "Cash out",
    cashOutHint: "Paid to kissans",
    closing: "Cash in hand",
    closingHint: (day: string) => `At the close of ${day}`,
    days: {
      caption: "Cash in and out each day",
      date: "Date",
      opening: "Opening",
      cashIn: "Cash in",
      cashOut: "Cash out",
      closing: "Closing",
      total: "Total",
      empty: "No cash vouchers on these days.",
    },
    vouchers: {
      title: "Cash vouchers",
      description:
        "The vouchers behind the totals. Bank, cheque and online vouchers and cancelled ones are not cash.",
      caption: "Cash vouchers",
      voucherNo: "Voucher no",
      date: "Date",
      type: "Type",
      trader: "Trader",
      cashIn: "In",
      cashOut: "Out",
      empty: {
        title: "No cash vouchers",
        body: "Cash paid to kissans and received from beoparis shows here.",
      },
    },
    note: "Only cash vouchers count. Amounts paid or received on a purchase or sale itself are not in the cash book.",
  },
} as const;
