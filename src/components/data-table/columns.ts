import {
  type ColumnDef,
  createColumnHelper,
  metaHelper,
  type RowData,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

/** Per-column layout hints read by `DataTable`. */
export interface DataTableColumnMeta {
  /** `end` for numbers. Logical, so it flips in RTL. */
  align?: "start" | "end";
  /** Extra classes for the header and body cells of this column. */
  className?: string;
}

/**
 * Features every `DataTable` registers. Paging and sorting are done by the
 * server (`manualPagination`, `manualSorting`), so no client row models.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableFeatures = typeof dataTableFeatures;

/** Columns of one table have different value types, hence `any`. */
export type DataTableColumn<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

/** Typed column helper for a `DataTable` of `TData` rows. */
export function dataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}
