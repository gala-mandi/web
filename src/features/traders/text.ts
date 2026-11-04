import type { BalanceType, TraderType } from "./types";

/**
 * Every user-facing string of the Traders pages, the trader form and the
 * trader picker. Kept out of the components so an Urdu version can be added
 * later.
 */

export const traderTypeText = {
  kissan: "Kissan",
  beopari: "Beopari",
  arhti: "Arhti",
} as const satisfies Record<TraderType, string>;

export const traderTypeHint = {
  kissan: "Farmer who sells grain",
  beopari: "Buyer of grain",
  arhti: "Commission agent",
} as const satisfies Record<TraderType, string>;

export const balanceTypeText = {
  debit: "Debit",
  credit: "Credit",
} as const satisfies Record<BalanceType, string>;

const errors = {
  typeRequired: "Choose kissan, beopari or arhti",
  nameRequired: "Enter the name (at least 2 characters)",
  tooLong: (max: number) => `Use at most ${max} characters`,
  phoneInvalid: "Enter a valid phone number",
  cnicInvalid: "Enter the CNIC as 12345-1234567-1",
  money: "Enter an amount in rupees (up to 2 decimals)",
  phoneTaken: "Another trader in this shop has this phone number",
  generic: "Something went wrong. Please try again.",
  network: "Can’t reach the server. Check your internet and try again.",
} as const;

export const traderText = {
  /** "s/o Muhammad Akram" under a trader's name. */
  fatherOf: (name: string) => `s/o ${name}`,
  /** Shown before the father's name (which keeps its own direction). */
  fatherPrefix: "s/o",
  none: "—",
  active: "Active",
  inactive: "Inactive",
  list: {
    addButton: "Add trader",
    tabsLabel: "Trader types",
    allTypes: "All",
    searchLabel: "Search traders",
    searchPlaceholder: "Name or phone",
    statusLabel: "Status",
    statusAll: "All",
    caption: "Traders of this shop",
    exportFileName: "traders",
    columns: {
      name: "Name",
      type: "Type",
      phone: "Phone",
      village: "Village",
      openingBalance: "Opening balance",
      status: "Status",
      added: "Added",
    },
    empty: {
      title: "No traders yet",
      body: "Add the kissans, beoparis and arhtis your shop deals with.",
    },
    noMatches: {
      title: "No traders match",
      body: "Try another name or phone number, or clear the filters.",
      clear: "Clear filters",
    },
  },
  actions: {
    view: "View profile",
    edit: "Edit",
    deactivate: "Deactivate",
    activate: "Activate",
    delete: "Delete",
  },
  status: {
    deactivate: {
      title: (name: string) => `Deactivate ${name}?`,
      body: "They won’t show up when picking a trader for a new purchase, sale or payment. Their khata and past entries stay, and reports still show them.",
      confirm: "Deactivate",
      pending: "Deactivating…",
      done: (name: string) => `${name} is deactivated.`,
    },
    activate: {
      title: (name: string) => `Activate ${name}?`,
      body: "They can be picked for purchases, sales and payments again.",
      confirm: "Activate",
      pending: "Activating…",
      done: (name: string) => `${name} is active again.`,
    },
    cancel: "Cancel",
  },
  delete: {
    title: (name: string) => `Delete ${name}?`,
    body: "The trader is removed from your lists. A trader with purchases, sales or payments can’t be deleted: deactivate them instead.",
    confirm: "Delete",
    pending: "Deleting…",
    done: (name: string) => `${name} is deleted.`,
    hasTransactions:
      "This trader has transactions and cannot be deleted. Deactivate the trader instead.",
    deactivateInstead: "Deactivate instead",
    cancel: "Cancel",
    close: "Close",
  },
  form: {
    addTitle: "Add trader",
    addDescription:
      "Only the type and name are needed; add the rest now or later.",
    editTitle: (name: string) => `Edit ${name}`,
    editDescription: "Change the details and save.",
    sections: {
      basic: "Basic details",
      address: "Address",
      opening: "Opening balance and limit",
      notes: "Notes",
    },
    optional: "optional",
    type: "Type",
    name: "Name",
    namePlaceholder: "e.g. Muhammad Aslam",
    fatherName: "Father’s name",
    phone: "Phone",
    phonePlaceholder: "0300 1234567",
    cnic: "CNIC",
    cnicPlaceholder: "12345-1234567-1",
    village: "Village",
    address: "Address",
    openingBalance: "Opening balance",
    openingBalanceHint:
      "What was owed before this shop started using Galla Mandi. Leave empty for none.",
    openingBalanceType: "Who owes it?",
    balanceTypes: {
      debit: {
        label: "Debit (receivable)",
        hint: "The trader owes the shop",
      },
      credit: {
        label: "Credit (payable)",
        hint: "The shop owes the trader",
      },
    } satisfies Record<BalanceType, { label: string; hint: string }>,
    creditLimit: "Credit limit",
    creditLimitHint: "Leave empty for no limit.",
    notes: "Notes",
    isActive: "Active",
    isActiveHint:
      "Inactive traders can’t be picked for new entries but stay in reports.",
    currency: "Rs",
    submitAdd: "Add trader",
    submitEdit: "Save changes",
    saving: "Saving…",
    cancel: "Cancel",
    added: (name: string) => `${name} added.`,
    saved: (name: string) => `${name} saved.`,
    nothingChanged: "Nothing changed.",
  },
  profile: {
    back: "Back to traders",
    edit: "Edit",
    loading: "Loading trader…",
    details: "Details",
    fields: {
      type: "Type",
      status: "Status",
      fatherName: "Father’s name",
      phone: "Phone",
      cnic: "CNIC",
      village: "Village",
      address: "Address",
      openingBalance: "Opening balance",
      creditLimit: "Credit limit",
      notes: "Notes",
      added: "Added on",
    },
    noLimit: "No limit",
    balance: {
      title: "Current balance",
      receivable: "Receivable",
      payable: "Payable",
      settled: "Settled",
      receivableHint: (name: string) => `${name} owes the shop this amount.`,
      payableHint: (name: string) => `The shop owes ${name} this amount.`,
      settledHint: "Nothing is owed either way.",
    },
    transactions: {
      title: "Recent transactions",
      emptyTitle: "No transactions yet",
      emptyBody:
        "Purchases, sales and payments with this trader will appear here once those modules are ready.",
    },
    error: {
      title: "Couldn’t load this trader",
      body: "Check your internet and try again.",
      retry: "Try again",
    },
  },
  combobox: {
    placeholder: "Pick a trader",
    searchLabel: "Search traders",
    searchPlaceholder: "Search name or phone…",
    results: "Traders",
    loading: "Searching…",
    error: "Couldn’t load traders.",
    retry: "Try again",
    empty: (query: string) =>
      query ? `No active trader matches “${query}”.` : "No active traders yet.",
    quickAdd: (query: string) => `Add “${query}” as new trader`,
  },
  errors,
} as const;
