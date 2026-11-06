import { type Ref } from "react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isNumeric } from "../cell-format";
import type { ReportSheet, ReportTable } from "../sheet";
import { reportText } from "../text";
import { ReportCellView } from "./report-cell";

const w = reportText.document;
const cell = "border-b px-2 py-1.5 align-top";

function DocumentTable({
  table,
  maundKg,
}: {
  table: ReportTable;
  maundKg: string;
}) {
  const align = (i: number) =>
    isNumeric(table.columns[i]?.kind ?? "text") ? "text-end" : "text-start";

  if (table.layout === "pairs") {
    return (
      <section data-print-table={table.id} className="break-inside-avoid">
        <h2 className="mb-1 text-[13px] font-bold">{table.title}</h2>
        <table className="w-full border-collapse">
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className={cn(cell, "text-start font-normal")}>
                  <ReportCellView cell={row.cells[0]} links={false} />
                </th>
                <td className={cn(cell, "text-end font-semibold")}>
                  <ReportCellView
                    cell={row.cells[1]}
                    maundKg={maundKg}
                    links={false}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  return (
    <section data-print-table={table.id} className="flex flex-col gap-1">
      {table.title ? (
        <h2 className="text-[13px] font-bold">{table.title}</h2>
      ) : null}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2">
            {table.columns.map((column, i) => (
              <th
                key={column.id}
                scope="col"
                className={cn(cell, "font-semibold", align(i))}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.columns.length}
                className={cn(cell, "text-center")}
              >
                {table.empty}
              </td>
            </tr>
          ) : (
            table.rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((value, i) => (
                  <td key={table.columns[i].id} className={cn(cell, align(i))}>
                    <ReportCellView
                      cell={value}
                      maundKg={maundKg}
                      links={false}
                    />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {table.totals ? (
          <tfoot>
            <tr data-print-totals className="border-t-2 font-bold">
              {table.totals.map((value, i) => (
                <td key={table.columns[i].id} className={cn(cell, align(i))}>
                  <ReportCellView
                    cell={value}
                    maundKg={maundKg}
                    links={false}
                  />
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
      {table.note ? (
        <p className="text-muted-foreground text-[10px]">{table.note}</p>
      ) : null}
    </section>
  );
}

export interface ReportDocumentProps {
  sheet: ReportSheet;
  shopName: string | null;
  maundKg: string;
  printedAt: Date;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The printable / PDF report on A4: shop, title, period and filters, then
 * every table with its totals row (the same model as the screen and the
 * Excel file). Long tables run over several sheets with the headings
 * repeated (see `reportPageStyle`).
 */
export function ReportDocument({
  sheet,
  shopName,
  maundKg,
  printedAt,
  ref,
}: ReportDocumentProps) {
  const pairs = sheet.tables.filter((t) => t.layout === "pairs");
  const tables = sheet.tables.filter((t) => t.layout === "table");
  return (
    <div
      ref={ref}
      data-report-document={sheet.slug}
      className="bg-card text-card-foreground text-[11px] leading-relaxed"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b-2 pb-3">
        <div>
          {shopName ? (
            <p className="text-lg font-extrabold">
              <bdi dir="auto">{shopName}</bdi>
            </p>
          ) : null}
          <h1 className="text-base font-bold">{sheet.title}</h1>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
          <dt className="text-muted-foreground">{w.period}</dt>
          <dd className="font-semibold">{sheet.period}</dd>
          {sheet.filters.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-muted-foreground">{name}</dt>
              <dd>
                <bdi dir="auto">{value}</bdi>
              </dd>
            </div>
          ))}
          <dt className="text-muted-foreground">{w.printedOn}</dt>
          <dd>{formatDate(printedAt)}</dd>
        </dl>
      </header>

      {pairs.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-4">
          {pairs.map((table) => (
            <DocumentTable key={table.id} table={table} maundKg={maundKg} />
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-5">
        {tables.map((table) => (
          <DocumentTable key={table.id} table={table} maundKg={maundKg} />
        ))}
      </div>
    </div>
  );
}

/**
 * `@page` rules of a printed report: A4, a page number at the foot of every
 * sheet, headings repeated, no line split over two sheets.
 */
export function reportPageStyle(): string {
  return `
@page {
  size: A4;
  margin: 12mm 10mm 16mm;
  @bottom-center {
    content: "${w.page} " counter(page) " ${w.of} " counter(pages);
    font-size: 9pt;
  }
}
@media print {
  html, body { background: #fff; }
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  thead { display: table-header-group; }
  tfoot { display: table-row-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
}`;
}
