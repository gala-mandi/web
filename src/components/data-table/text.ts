/**
 * User-facing strings of the shared DataTable. Kept out of the component so an
 * Urdu version can be added later.
 */
export const dataTableText = {
  loading: "Loading…",
  errorTitle: "Couldn’t load this list",
  errorBody: "Check your internet and try again.",
  retry: "Try again",
  emptyTitle: "Nothing here yet",
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
} as const;
