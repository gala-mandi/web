import { unitText } from "@/features/settings/text";
import type { ChargeField, WeightUnit } from "./types";

/**
 * Every user-facing string of the Commodities page, the commodity form and
 * the commodity picker. Kept out of the components so an Urdu version can be
 * added later.
 */

/** Long unit names for the form, the same as on the Settings page. */
export { unitText };

/** Short unit names for the list and the picker. */
export const unitShortText = {
  kg: "Kg",
  maund: "Maund",
  bag: "Bag",
} as const satisfies Record<WeightUnit, string>;

/**
 * Categories every new shop starts with (the server's default list). Offered
 * as suggestions and in the list filter; the field itself is free text.
 */
export const suggestedCategories = [
  "grain",
  "pulse",
  "oilseed",
  "fibre",
  "vegetable",
] as const;

export const categoryText: Record<string, string> = {
  grain: "Grain",
  pulse: "Pulse",
  oilseed: "Oilseed",
  fibre: "Fibre",
  vegetable: "Vegetable",
};

/** "grain" → "Grain"; a shop's own category shows as typed. */
export function categoryLabel(category: string): string {
  return categoryText[category.toLowerCase()] ?? category;
}

const errors = {
  nameRequired: "Enter the name (at least 2 characters)",
  tooLong: (max: number) => `Use at most ${max} characters`,
  unitRequired: "Choose kg, maund or bag",
  bagWeight: "Enter the bag weight in kg (up to 3 decimals)",
  bagWeightZero: "Bag weight must be more than 0",
  percent: "Enter a percentage from 0 to 100 (up to 2 decimals)",
  money: "Enter an amount in rupees (up to 2 decimals)",
  nameTaken: "Another commodity in this shop has this name",
  generic: "Something went wrong. Please try again.",
  network: "Can’t reach the server. Check your internet and try again.",
} as const;

/** Labels of the charge overrides. */
const chargeLabels = {
  commissionPct: "Commission",
  marketFeePct: "Market fee",
  labourPerBag: "Labour per bag",
} as const satisfies Record<ChargeField, string>;

export const commodityText = {
  none: "—",
  active: "Active",
  inactive: "Inactive",
  /** "100 kg bag" (the weight comes formatted, e.g. "100 kg"). */
  bagOf: (weight: string) => `${weight} bag`,
  percent: (value: string) => `${value}%`,
  list: {
    addButton: "Add commodity",
    searchLabel: "Search commodities",
    searchPlaceholder: "Name or Urdu name",
    statusLabel: "Status",
    statusAll: "All",
    categoryLabel: "Category",
    categoryAll: "All",
    caption: "Commodities of this shop",
    exportFileName: "commodities",
    shopDefault: "Shop default",
    /** "Commission 2.50%" */
    charge: (field: ChargeField, value: string) =>
      `${chargeLabels[field]} ${value}`,
    columns: {
      name: "Name",
      nameUr: "Urdu name",
      category: "Category",
      defaultUnit: "Default unit",
      bagWeight: "Bag weight",
      charges: "Charges",
      status: "Status",
      added: "Added",
    },
    empty: {
      title: "No commodities yet",
      body: "Add the grains and crops your shop buys and sells.",
    },
    noMatches: {
      title: "No commodities match",
      body: "Try another name, or clear the filters.",
      clear: "Clear filters",
    },
  },
  actions: {
    edit: "Edit",
    editName: (name: string) => `Edit ${name}`,
    deactivate: "Deactivate",
    activate: "Activate",
    delete: "Delete",
  },
  status: {
    deactivate: {
      title: (name: string) => `Deactivate ${name}?`,
      body: "It won’t show up when picking a commodity for new rates, purchases or sales. Past entries keep it, and reports still show it.",
      confirm: "Deactivate",
      pending: "Deactivating…",
      done: (name: string) => `${name} is deactivated.`,
    },
    activate: {
      title: (name: string) => `Activate ${name}?`,
      body: "It can be picked for rates, purchases and sales again.",
      confirm: "Activate",
      pending: "Activating…",
      done: (name: string) => `${name} is active again.`,
    },
    cancel: "Cancel",
  },
  delete: {
    title: (name: string) => `Delete ${name}?`,
    body: "The commodity is removed from your list. A commodity used in rates, purchases or sales can’t be deleted: deactivate it instead.",
    confirm: "Delete",
    pending: "Deleting…",
    done: (name: string) => `${name} is deleted.`,
    inUse:
      "This commodity is used in rates, purchases or sales and cannot be deleted. Deactivate it instead.",
    deactivateInstead: "Deactivate instead",
    cancel: "Cancel",
    close: "Close",
  },
  form: {
    addTitle: "Add commodity",
    addDescription:
      "Only the name is needed; charges left empty use the shop’s defaults.",
    editTitle: (name: string) => `Edit ${name}`,
    editDescription: "Change the details and save.",
    sections: {
      basic: "Basic details",
      units: "Unit and bag",
      charges: "Charges",
    },
    chargesHint:
      "Set these only when this commodity is charged differently from the rest of the shop.",
    optional: "optional",
    name: "Name",
    namePlaceholder: "e.g. Gandum",
    nameUr: "Urdu name",
    nameUrPlaceholder: "مثلاً گندم",
    category: "Category",
    categoryPlaceholder: "e.g. grain",
    categoryHint: "Used to group and filter the list.",
    defaultUnit: "Default unit",
    defaultUnitHint: "What new rates and purchases start with.",
    bagWeightKg: "Bag weight",
    bagWeightHint: "Kg in one bag (bori). Leave empty to enter it each time.",
    bagWeightPlaceholder: "e.g. 100",
    charges: chargeLabels,
    /** Hint under an override when the shop default is known. */
    shopDefault: (value: string) =>
      `Shop default: ${value}. Leave empty to use it.`,
    /** When the shop default can't be read (no settings access). */
    shopDefaultUnknown: "Leave empty to use the shop default.",
    useDefault: "Use shop default",
    useDefaultFor: (label: string) => `${label}: use shop default`,
    isActive: "Active",
    isActiveHint:
      "Inactive commodities can’t be picked for new entries but stay in past entries and reports.",
    currency: "Rs",
    kg: "kg",
    submitAdd: "Add commodity",
    submitEdit: "Save changes",
    saving: "Saving…",
    cancel: "Cancel",
    added: (name: string) => `${name} added.`,
    saved: (name: string) => `${name} saved.`,
    nothingChanged: "Nothing changed.",
  },
  combobox: {
    placeholder: "Pick a commodity",
    searchLabel: "Search commodities",
    searchPlaceholder: "Search name or Urdu name…",
    results: "Commodities",
    loading: "Searching…",
    error: "Couldn’t load commodities.",
    retry: "Try again",
    empty: (query: string) =>
      query
        ? `No active commodity matches “${query}”.`
        : "No active commodities yet.",
  },
  errors,
} as const;
