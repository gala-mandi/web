"use client";

import type { ColumnVisibilityState, RowData } from "@tanstack/react-table";
import { Download, Search, Settings2, X } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { type DataTableColumn, getLabelledColumns } from "./columns";
import { exportToExcel } from "./export";
import { dataTableText as t } from "./text";

export interface DataTableToolbarProps {
  /** Search box; leave out for a table without search. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
  };
  /** Filter controls (`DataTableSelectFilter`, `DataTableDateRangeFilter`…). */
  filters?: ReactNode;
  /** Shows "Clear filters" when true. */
  isFiltered?: boolean;
  onClearFilters?: () => void;
  /** End side: `DataTableViewOptions`, `DataTableExport`, … */
  actions?: ReactNode;
  className?: string;
}

/** Search, filters, "Clear filters" and table actions above a `DataTable`. */
export function DataTableToolbar({
  search,
  filters,
  isFiltered = false,
  onClearFilters,
  actions,
  className,
}: DataTableToolbarProps) {
  const searchId = useId();

  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end",
        className,
      )}
    >
      <div
        role="search"
        className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        {search ? (
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <label htmlFor={searchId} className="text-[13px] font-semibold">
              {search.label ?? t.toolbar.search}
            </label>
            <InputGroup className="rounded-field bg-card h-10">
              <InputGroupAddon className="text-muted-foreground ps-3">
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                id={searchId}
                type="search"
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={search.placeholder}
                autoComplete="off"
              />
            </InputGroup>
          </div>
        ) : null}
        {filters}
        {isFiltered && onClearFilters ? (
          <Button
            variant="ghost"
            className="h-10 gap-1.5 self-start sm:self-end"
            onClick={onClearFilters}
          >
            <X aria-hidden />
            {t.toolbar.clearFilters}
          </Button>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2 lg:ms-auto">{actions}</div>
      ) : null}
    </div>
  );
}

export interface DataTableViewOptionsProps<TData extends RowData> {
  columns: DataTableColumn<TData>[];
  columnVisibility: ColumnVisibilityState;
  onColumnVisibilityChange: (next: ColumnVisibilityState) => void;
}

/** Menu with a checkbox per labelled column; the last shown one stays. */
export function DataTableViewOptions<TData extends RowData>({
  columns,
  columnVisibility,
  onColumnVisibilityChange,
}: DataTableViewOptionsProps<TData>) {
  const labelled = getLabelledColumns(columns);
  const shown = labelled.filter((c) => columnVisibility[c.id] !== false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 gap-1.5 px-3">
          <Settings2 aria-hidden />
          {t.view.button}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>{t.view.title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {labelled.map((column) => {
          const visible = columnVisibility[column.id] !== false;
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={visible}
              disabled={visible && shown.length === 1}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) =>
                onColumnVisibilityChange({
                  ...columnVisibility,
                  [column.id]: checked === true,
                })
              }
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface DataTableExportProps<TData extends RowData> {
  /** Base file name, e.g. `shops` → `shops-2026-10-29.xlsx`. */
  fileName: string;
  columns: DataTableColumn<TData>[];
  /** The rows on screen; the button is disabled when there are none. */
  rows: TData[] | undefined;
  columnVisibility?: ColumnVisibilityState;
}

/** "Export to Excel": the current page with the visible columns. */
export function DataTableExport<TData extends RowData>({
  fileName,
  columns,
  rows,
  columnVisibility,
}: DataTableExportProps<TData>) {
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    if (!rows?.length) return;
    setBusy(true);
    try {
      await exportToExcel({ fileName, columns, rows, columnVisibility });
    } catch {
      toast.error(t.export.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="h-10 gap-1.5 px-3"
      disabled={busy || !rows?.length}
      onClick={() => void onExport()}
    >
      <Download aria-hidden />
      {busy ? t.export.busy : t.export.button}
    </Button>
  );
}
