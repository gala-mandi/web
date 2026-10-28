import type { Language, WeightUnit } from "./types";

/**
 * Every user-facing string of the Settings page.
 * Kept out of the components so an Urdu version can be added later.
 */

export const unitText = {
  kg: "Kilogram (kg)",
  maund: "Maund (mn)",
  bag: "Bag (bori)",
} as const satisfies Record<WeightUnit, string>;

export const languageText = {
  en: "English",
  ur: "اردو (Urdu)",
} as const satisfies Record<Language, string>;

export const settingsText = {
  loadError: "Could not load the shop settings.",
  retry: "Try again",
  save: "Save changes",
  saving: "Saving…",
  discard: "Discard changes",
  saved: "Settings saved",
  nothingChanged: "No changes to save",
  unsaved: "You have unsaved changes",
  sections: {
    profile: {
      title: "Shop profile",
      description: "Your shop's name, logo and contact details.",
    },
    parchi: {
      title: "Parchi",
      description: "What is printed at the top and bottom of every bill.",
    },
    charges: {
      title: "Charges & commission",
      description:
        "Used for new purchases. Purchases already saved keep their own values.",
    },
    units: {
      title: "Units",
      description: "How weights are entered and shown.",
    },
    numbering: {
      title: "Numbering",
      description: "How bill numbers look and when the year starts.",
    },
  },
  fields: {
    name: "Shop name",
    phone: "Phone",
    phonePlaceholder: "03XX XXXXXXX",
    email: "Email",
    emailPlaceholder: "Optional",
    city: "City",
    address: "Address",
    displayName: "Name on parchi",
    displayNameHint: "Leave empty to print the shop name.",
    parchiFooter: "Footer text",
    parchiFooterHint:
      "e.g. thanks, terms or bank details. Up to 500 characters.",
    defaultCommissionPct: "Commission",
    defaultCommissionPctHint: "Percent of the sale amount.",
    marketFeePct: "Market fee",
    marketFeePctHint: "Percent of the sale amount.",
    labourPerBag: "Labour per bag",
    labourPerBagHint: "Rupees for each bag (bori).",
    defaultUnit: "Default unit",
    maundKg: "Kg in one maund",
    maundKgHint: (example: string) => `Example: 1,000 kg = ${example}`,
    language: "Language",
    billPrefix: "Bill number prefix",
    billPrefixHint: (example: string) => `Next bill looks like ${example}.`,
    financialYearStart: "Financial year starts on",
  },
  logo: {
    label: "Logo",
    drop: "Drop a logo here or click to choose",
    dropActive: "Drop the image here",
    rules: "PNG or JPG, up to 1 MB",
    uploading: "Uploading…",
    uploaded: "Logo updated",
    remove: "Remove logo",
    removed: "Logo removed",
    tooLarge: "The logo must be 1 MB or smaller",
    wrongType: "The logo must be a PNG or JPG image",
    oneFile: "Choose one image",
  },
  preview: {
    title: "Parchi preview",
    description: "Updates as you type.",
    bill: "Bill no.",
    date: "Date",
    phone: "Ph",
    sampleDate: "29 Oct 2026",
  },
  errors: {
    nameRequired: "Enter the shop name",
    tooLong: (max: number) => `Use at most ${max} characters`,
    phoneRequired: "Enter the phone number",
    phoneInvalid: "Enter a valid mobile number, e.g. 0300 1234567",
    emailInvalid: "Enter a valid email",
    percent: "Enter a percentage from 0 to 100 (up to 2 decimals)",
    money: "Enter an amount in rupees (up to 2 decimals)",
    maundKg: "Enter kg per maund, more than 0 (up to 3 decimals)",
    billPrefix: "Use letters, digits, - or / only",
    date: "Enter a valid date",
    generic: "Something went wrong. Please try again.",
    network: "No connection to the server. Check your internet and try again.",
  },
} as const;
