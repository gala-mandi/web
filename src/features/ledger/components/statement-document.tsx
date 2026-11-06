import { type Ref } from "react";
import { cn } from "@/lib/utils";
import {
  statementBalance,
  statementDay,
  statementDetails,
  statementPeriod,
} from "../statement";
import { type StatementLanguage, statementText } from "../text";
import type { Statement } from "../types";

const cell = "border-b px-2 py-1.5 align-top";
const num = "text-end tabular-nums whitespace-nowrap";

function Money({ value }: { value: string }) {
  if (!/[1-9]/.test(value)) return null;
  return <span dir="ltr">{statementBalance(value, "en").amount}</span>;
}

function Balance({ value, lang }: { value: string; lang: StatementLanguage }) {
  const { amount, side } = statementBalance(value, lang);
  return (
    <>
      <span dir="ltr">{amount}</span>
      {side ? ` ${side}` : null}
    </>
  );
}

export interface StatementDocumentProps {
  /** The whole period (every page), not only the page on screen. */
  statement: Statement;
  lang: StatementLanguage;
  shopName: string | null;
  printedAt: Date;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The printable / PDF khata statement: shop, trader, period, opening
 * balance, every line with its running balance, closing balance. A long
 * statement runs over several sheets: the column headings repeat on each
 * and a line is never split (see `statementPageStyle`). Urdu prints right
 * to left in Nastaliq; amounts stay left-to-right.
 */
export function StatementDocument({
  statement,
  lang,
  shopName,
  printedAt,
  ref,
}: StatementDocumentProps) {
  const w = statementText[lang];
  const c = w.columns;
  return (
    <div
      ref={ref}
      lang={lang}
      dir={lang === "ur" ? "rtl" : "ltr"}
      data-statement={lang}
      className={cn(
        "bg-card text-card-foreground text-[12px] leading-relaxed",
        lang === "ur" && "font-urdu leading-loose",
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b pb-3">
        <div>
          {shopName ? (
            <p className="text-lg font-extrabold">
              <bdi dir="auto">{shopName}</bdi>
            </p>
          ) : null}
          <h1 className="text-base font-bold">{w.title}</h1>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
          <dt className="text-muted-foreground">{w.trader}</dt>
          <dd className="font-semibold">
            <bdi dir="auto">{statement.trader.name}</bdi> (
            {w.traderTypes[statement.trader.type]})
          </dd>
          <dt className="text-muted-foreground">{w.period}</dt>
          <dd>{statementPeriod(statement, lang)}</dd>
          <dt className="text-muted-foreground">{w.printedOn}</dt>
          <dd>{statementDay(printedAt, lang)}</dd>
        </dl>
      </header>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 text-start">
            <th scope="col" className={cn(cell, "text-start")}>
              {c.date}
            </th>
            <th scope="col" className={cn(cell, "text-start")}>
              {c.details}
            </th>
            <th scope="col" className={cn(cell, "text-end")}>
              {c.debit}
            </th>
            <th scope="col" className={cn(cell, "text-end")}>
              {c.credit}
            </th>
            <th scope="col" className={cn(cell, "text-end")}>
              {c.balance}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="font-semibold">
            <td className={cell} />
            <td className={cell}>{w.openingBalance}</td>
            <td className={cell} />
            <td className={cell} />
            <td className={cn(cell, num)}>
              <Balance value={statement.openingBalance} lang={lang} />
            </td>
          </tr>
          {statement.data.length === 0 ? (
            <tr>
              <td colSpan={5} className={cn(cell, "text-center")}>
                {w.noEntries}
              </td>
            </tr>
          ) : (
            statement.data.map((entry) => (
              <tr
                key={entry.id}
                data-source={entry.sourceType}
                className={cn(
                  entry.sourceType === "adjustment" && "font-semibold",
                )}
              >
                <td className={cn(cell, "whitespace-nowrap")}>
                  {statementDay(entry.entryDate, lang)}
                </td>
                <td className={cell}>
                  <bdi dir="auto">{statementDetails(entry, lang)}</bdi>
                </td>
                <td className={cn(cell, num)}>
                  <Money value={entry.debit} />
                </td>
                <td className={cn(cell, num)}>
                  <Money value={entry.credit} />
                </td>
                <td className={cn(cell, num)}>
                  <Balance value={entry.balance} lang={lang} />
                </td>
              </tr>
            ))
          )}
          <tr className="border-t-2 text-sm font-bold">
            <td className={cell} />
            <td className={cell}>{w.closingBalance}</td>
            <td className={cell} />
            <td className={cell} />
            <td className={cn(cell, num)} data-testid="statement-closing">
              <Balance value={statement.closingBalance} lang={lang} />
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-[11px] text-muted-foreground">{w.legend}</p>
    </div>
  );
}

/**
 * `@page` rules of the printed statement: A4, a page number at the foot of
 * every sheet, headings repeated, no line split over two sheets.
 */
export function statementPageStyle(lang: StatementLanguage): string {
  const w = statementText[lang];
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
  tr { break-inside: avoid; page-break-inside: avoid; }
}`;
}
