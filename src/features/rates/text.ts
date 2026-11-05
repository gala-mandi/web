import type { RateUnit } from "./types";

/**
 * Every user-facing string of the Daily rates page: the entry grid, the date
 * picker and the trend chart. Kept out of the components so an Urdu version
 * can be added later.
 */

/** "per maund" / "per kg", shown next to each commodity. */
export const perUnitText = {
  maund: "per maund",
  kg: "per kg",
} as const satisfies Record<RateUnit, string>;

/** The three inputs of a row, in entry order. */
const columns = {
  commodity: "Commodity",
  minRate: "Min",
  maxRate: "Max",
  avgRate: "Avg",
} as const;

const errors = {
  money: "Enter a rate in rupees (up to 2 decimals)",
  minRequired: "Enter the min rate",
  maxRequired: "Enter the max rate",
  maxBelowMin: "Max rate must be at least the min rate",
  cannotClear: "A saved rate can’t be cleared; enter min and max",
  pastDay: "Only the owner or a manager can change the rates of a past day",
  generic: "Something went wrong. Please try again.",
  network: "Can’t reach the server. Check your internet and try again.",
} as const;

export const rateText = {
  none: "—",
  errors,
  date: {
    label: "Date",
    /** "Today, 6 Nov 2026" (the date comes formatted). */
    today: (date: string) => `Today, ${date}`,
    /** "Rates of 5 Nov 2026" (the date comes formatted). */
    showing: (date: string) => `Rates of ${date}`,
    backToToday: "Back to today",
    pastHint: "You’re changing the rates of a past day.",
  },
  grid: {
    caption: "Rates per commodity",
    columns,
    /** "Min rate for Gandum, per maund". */
    inputLabel: (column: "minRate" | "maxRate" | "avgRate", name: string) =>
      `${columns[column]} rate for ${name}`,
    optional: "optional",
    keyboardHint:
      "Tab or Enter moves to the next cell, Shift+Enter goes back. Leave a commodity empty to skip it.",
    readOnly:
      "You can view the rates; only the owner or a manager can change them.",
    copyYesterday: "Copy yesterday",
    copyYesterdayHint: (date: string) =>
      `Fill the empty rows with the rates of ${date}`,
    noYesterday: "No rates were saved the day before.",
    copied: (count: number) =>
      count === 1
        ? "Copied 1 rate from the day before. Check it and save."
        : `Copied ${count} rates from the day before. Check them and save.`,
    nothingToCopy: "Every row with a rate the day before is already filled.",
    save: "Save rates",
    saving: "Saving…",
    discard: "Discard changes",
    unsaved: "You have unsaved changes",
    saved: "Rates saved.",
    nothingChanged: "Nothing to save: enter at least one rate.",
    leaveWarning: "You have unsaved rates. Leave this page and lose them?",
    loadError: "Couldn’t load the rates.",
    retry: "Try again",
    empty: {
      title: "No commodities yet",
      body: "Add the commodities your shop trades, then enter their rates here.",
      action: "Add commodities",
    },
  },
  chart: {
    title: "Rate trend",
    description:
      "Average rate with the min–max band. Days without a rate are left empty.",
    commodityLabel: "Commodity",
    rangeLabel: "Period",
    /** "7 days". */
    range: (days: number) => `${days} days`,
    band: "Min–max",
    avg: "Avg",
    min: "Min",
    max: "Max",
    noRate: "No rate",
    noData: "No rates in this period.",
    loadError: "Couldn’t load the trend.",
    /** "Rs per maund" (axis title). */
    axis: (unit: RateUnit) => `Rs ${perUnitText[unit]}`,
  },
} as const;
