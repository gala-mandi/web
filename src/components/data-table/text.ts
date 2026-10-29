/**
 * User-facing strings of the shared DataTable and its toolbar. Kept out of the
 * components so an Urdu version can be added later.
 */
export const dataTableText = {
  loading: "Loading…",
  errorTitle: "Couldn’t load this list",
  errorBody: "Check your internet and try again.",
  retry: "Try again",
  emptyTitle: "Nothing here yet",
  results: (total: number) =>
    total === 0
      ? "No results"
      : `${total} ${total === 1 ? "result" : "results"}`,
  sortHint: {
    none: "Not sorted. Select to sort.",
    asc: "Sorted A to Z / oldest first. Select to reverse.",
    desc: "Sorted Z to A / newest first. Select to reverse.",
  },
  pagination: {
    label: "Pages",
    previous: "Previous page",
    next: "Next page",
    page: (page: number, pages: number) => `Page ${page} of ${pages}`,
    range: (from: number, to: number, total: number) =>
      total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`,
  },
  selection: {
    selectPage: "Select all rows on this page",
    selectRow: (name: string) => `Select ${name}`,
    bar: "Selected rows",
    count: (n: number) => `${n} selected`,
    clear: "Clear selection",
  },
  rowActions: (name: string) => `Actions for ${name}`,
  toolbar: {
    search: "Search",
    clearFilters: "Clear filters",
    all: "All",
  },
  dateRange: {
    any: "Any date",
    from: "From",
    to: "To",
    apply: "Apply",
    clear: "Clear",
    invalid: "The start date must be on or before the end date.",
    summary: (from: string | null, to: string | null) =>
      from && to ? `${from} – ${to}` : from ? `From ${from}` : `Until ${to}`,
  },
  view: {
    button: "Columns",
    title: "Show columns",
  },
  export: {
    button: "Export to Excel",
    busy: "Exporting…",
    failed: "Couldn’t export this list. Please try again.",
  },
} as const;
