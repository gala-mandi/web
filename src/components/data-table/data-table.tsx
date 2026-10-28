"use client";

import {
  functionalUpdate,
  type Header,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
} from "lucide-react";
import { type MouseEvent, type ReactNode, useId } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type DataTableColumn,
  type DataTableFeatures,
  dataTableFeatures,
} from "./columns";
import { dataTableText as t } from "./text";

export interface DataTableProps<TData extends RowData> {
  /** Stable (module scope or memoised) column definitions. */
  columns: DataTableColumn<TData>[];
  /** The current page from the server; `undefined` while nothing is loaded. */
  data: TData[] | undefined;
  getRowId: (row: TData) => string;
  /** Total rows on the server (for the page count). */
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: (next: PaginationState) => void;
  sorting?: SortingState;
  onSortingChange?: (next: SortingState) => void;
  /** First load: skeleton rows instead of data. */
  isLoading: boolean;
  /** A later page is loading while the previous one is still shown. */
  isFetching?: boolean;
  isError: boolean;
  onRetry?: () => void;
  /** Shown in place of the rows when the server returned none. */
  empty?: ReactNode;
  /** Accessible name of the table (visually hidden caption). */
  caption: string;
  /** Mouse convenience; every row must also have a keyboard link. */
  onRowClick?: (row: TData) => void;
}

const emptyRows: never[] = [];

function alignClass(align: "start" | "end" | undefined) {
  return align === "end" ? "text-end" : "text-start";
}

function ariaSort(sorted: false | "asc" | "desc") {
  if (sorted === "asc") return "ascending" as const;
  if (sorted === "desc") return "descending" as const;
  return "none" as const;
}

/** Clicks on links, buttons and inputs inside a row keep their own action. */
function fromInteractive(event: MouseEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement;
  return Boolean(
    target.closest("a, button, input, select, textarea, [role='button']"),
  );
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp aria-hidden className="size-3.5" />;
  if (sorted === "desc") return <ArrowDown aria-hidden className="size-3.5" />;
  return (
    <ChevronsUpDown aria-hidden className="text-muted-foreground size-3.5" />
  );
}

function HeaderCell<TData extends RowData>({
  header,
  render,
}: {
  header: Header<DataTableFeatures, TData, unknown>;
  render: ReactNode;
}) {
  const meta = header.column.columnDef.meta;
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();
  const hintId = useId();

  return (
    <TableHead
      scope="col"
      aria-sort={canSort ? ariaSort(sorted) : undefined}
      className={cn(
        "text-muted-foreground h-11 px-3 text-xs font-semibold tracking-wide uppercase",
        alignClass(meta?.align),
        meta?.className,
      )}
    >
      {header.isPlaceholder ? null : canSort ? (
        <button
          type="button"
          onClick={header.column.getToggleSortingHandler()}
          aria-describedby={hintId}
          className={cn(
            "hover:text-foreground focus-visible:ring-ring/50 -mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 uppercase outline-none focus-visible:ring-3",
            sorted && "text-foreground",
            meta?.align === "end" && "flex-row-reverse",
          )}
        >
          {render}
          <SortIcon sorted={sorted} />
          <span id={hintId} className="sr-only">
            {t.sortHint[sorted || "none"]}
          </span>
        </button>
      ) : (
        render
      )}
    </TableHead>
  );
}

/**
 * Shared list table (TanStack Table v9) with server-side paging and sorting,
 * loading skeleton rows, an empty state and an error state with retry.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  rowCount,
  pagination,
  onPaginationChange,
  sorting = emptyRows,
  onSortingChange,
  isLoading,
  isFetching = false,
  isError,
  onRetry,
  empty,
  caption,
  onRowClick,
}: DataTableProps<TData>) {
  const handleSorting: OnChangeFn<SortingState> = (updater) =>
    onSortingChange?.(functionalUpdate(updater, sorting));
  const handlePagination: OnChangeFn<PaginationState> = (updater) =>
    onPaginationChange(functionalUpdate(updater, pagination));

  const table = useTable<DataTableFeatures, TData>({
    features: dataTableFeatures,
    columns,
    data: data ?? (emptyRows as TData[]),
    getRowId: (row) => getRowId(row),
    rowCount,
    state: { sorting, pagination },
    onSortingChange: handleSorting,
    onPaginationChange: handlePagination,
    manualSorting: true,
    manualPagination: true,
    enableSorting: Boolean(onSortingChange),
    enableMultiSort: false,
    enableSortingRemoval: false,
  });

  const columnCount = columns.length;
  const rows = table.getRowModel().rows;
  const pageCount = Math.max(1, table.getPageCount());
  const page = pagination.pageIndex + 1;
  const from =
    rowCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const to = Math.min(rowCount, from + rows.length - 1);
  const showPager = !isLoading && !isError && rowCount > 0;
  const busy = isLoading || isFetching;

  return (
    <div className="bg-card text-card-foreground rounded-card overflow-hidden border">
      <Table
        aria-busy={busy || undefined}
        className={cn(isFetching && !isLoading && "opacity-60")}
      >
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader className="bg-surface-muted/60">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => (
                <HeaderCell
                  key={header.id}
                  header={header}
                  render={<table.FlexRender header={header} />}
                />
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: Math.min(pagination.pageSize, 8) }, (_, i) => (
              <TableRow
                key={`skeleton-${i}`}
                data-testid="data-table-skeleton-row"
                className="hover:bg-transparent"
              >
                {Array.from({ length: columnCount }, (_, j) => (
                  <TableCell key={j} className="px-3 py-3.5">
                    {i === 0 && j === 0 ? (
                      <span className="sr-only" role="status">
                        {t.loading}
                      </span>
                    ) : null}
                    <Skeleton className="h-4 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columnCount}
                className="p-0 whitespace-normal"
              >
                <div
                  role="alert"
                  className="flex flex-col items-center gap-3 px-6 py-12 text-center"
                >
                  <CircleAlert
                    aria-hidden
                    className="text-destructive size-6"
                  />
                  <p className="font-heading font-bold">{t.errorTitle}</p>
                  <p className="text-muted-foreground text-sm">{t.errorBody}</p>
                  {onRetry ? (
                    <Button variant="outline" onClick={onRetry}>
                      {t.retry}
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columnCount}
                className="p-0 whitespace-normal"
              >
                {empty ?? (
                  <p className="text-muted-foreground px-6 py-12 text-center">
                    {t.emptyTitle}
                  </p>
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={
                  onRowClick
                    ? (event) => {
                        if (!fromInteractive(event)) onRowClick(row.original);
                      }
                    : undefined
                }
                className={cn(onRowClick && "cursor-pointer")}
              >
                {row.getAllCells().map((cell) => {
                  const meta = cell.column.columnDef.meta;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-3 py-3",
                        alignClass(meta?.align),
                        meta?.className,
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showPager ? (
        <nav
          aria-label={t.pagination.label}
          className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-muted-foreground" aria-live="polite">
            {t.pagination.range(from, to, rowCount)}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground me-1">
              {t.pagination.page(page, pageCount)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label={t.pagination.previous}
              disabled={!table.getCanPreviousPage() || busy}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft aria-hidden className="rtl:rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t.pagination.next}
              disabled={!table.getCanNextPage() || busy}
              onClick={() => table.nextPage()}
            >
              <ChevronRight aria-hidden className="rtl:rotate-180" />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
