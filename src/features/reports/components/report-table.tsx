"use client";

import { useMemo } from "react";
import {
  DataTable,
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { isNumeric } from "../cell-format";
import type { ReportRow, ReportTable } from "../sheet";
import { ReportCellView } from "./report-cell";

const col = dataTableColumnHelper<ReportRow>();
const getRowId = (row: ReportRow) => row.id;
const noop = () => {};

/** Columns of the shared DataTable from a report table; totals as footer. */
function reportColumns(
  table: ReportTable,
  maundKg: string,
): DataTableColumn<ReportRow>[] {
  const totals = table.totals;
  return table.columns.map((column, i) =>
    col.display({
      id: column.id,
      header: column.label,
      meta: {
        align: isNumeric(column.kind) ? "end" : "start",
        className:
          i === 0
            ? "ps-4"
            : i === table.columns.length - 1
              ? "pe-4"
              : undefined,
      },
      cell: ({ row }) => (
        <ReportCellView cell={row.original.cells[i]} maundKg={maundKg} />
      ),
      footer: totals
        ? () => (
            <ReportCellView cell={totals[i]} maundKg={maundKg} links={false} />
          )
        : undefined,
    }),
  );
}

/**
 * A report table on screen: the shared DataTable with every row on one page
 * and the server's totals as its last row; a `pairs` table is a card of
 * label / value lines.
 */
export function ReportTableView({
  table,
  maundKg,
  isFetching = false,
}: {
  table: ReportTable;
  maundKg: string;
  isFetching?: boolean;
}) {
  const columns = useMemo(
    () => reportColumns(table, maundKg),
    [table, maundKg],
  );
  const headingId = `report-${table.id}-title`;

  if (table.layout === "pairs") {
    return (
      <Card
        data-report-table={table.id}
        aria-labelledby={headingId}
        className="rounded-card gap-3 p-4 sm:p-5"
      >
        <h2 id={headingId} className="font-heading text-base font-bold">
          {table.title}
        </h2>
        <dl className="flex flex-col divide-y">
          {table.rows.map((row) => (
            <div
              key={row.id}
              className="flex items-baseline justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0"
            >
              <dt className="text-muted-foreground">
                <ReportCellView cell={row.cells[0]} />
              </dt>
              <dd className="text-end font-semibold">
                <ReportCellView cell={row.cells[1]} maundKg={maundKg} />
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    );
  }

  return (
    <section
      data-report-table={table.id}
      aria-labelledby={table.title ? headingId : undefined}
      className="flex flex-col gap-3"
    >
      {table.title ? (
        <h2 id={headingId} className="font-heading text-lg font-bold">
          {table.title}
        </h2>
      ) : null}
      <DataTable
        caption={table.caption}
        columns={columns}
        data={table.rows}
        getRowId={getRowId}
        rowCount={table.rows.length}
        pagination={{ pageIndex: 0, pageSize: Math.max(1, table.rows.length) }}
        onPaginationChange={noop}
        isLoading={false}
        isFetching={isFetching}
        isError={false}
        showFooter={table.totals !== null}
        hidePagination
        empty={
          <p className="text-muted-foreground px-6 py-12 text-center">
            {table.empty}
          </p>
        }
      />
      {table.note ? (
        <p className="text-muted-foreground text-xs">{table.note}</p>
      ) : null}
    </section>
  );
}
