import { exportFileName } from "@/components/data-table/export";
import { readBalance } from "@/features/traders/balance";
import { formatDate, formatRs } from "@/lib/format";
import { type StatementLanguage, statementText } from "./statement-words";
import type { Statement, StatementEntry } from "./types";

/**
 * The statement handed to a trader (print, PDF, Excel), in English or
 * Urdu. Amounts are the server's strings, only formatted: no money maths.
 */

/** A `YYYY-MM-DD` day (or a timestamp) in the statement's language. */
export function statementDay(
  value: string | Date,
  lang: StatementLanguage,
): string {
  return formatDate(value, lang);
}

/** "-60000.00" → `{ amount: "Rs 60,000.00", side: "Cr" }` ("" when settled). */
export function statementBalance(
  balance: string,
  lang: StatementLanguage,
): { amount: string; side: string } {
  const { kind, amount } = readBalance(balance);
  const w = statementText[lang];
  return {
    amount: formatRs(amount, lang),
    side: kind === "receivable" ? w.dr : kind === "payable" ? w.cr : "",
  };
}

/** The period line: "All dates", "From …", "Up to …" or "… to …". */
export function statementPeriod(
  statement: Pick<Statement, "from" | "to">,
  lang: StatementLanguage,
): string {
  const w = statementText[lang];
  const from = statement.from ? statementDay(statement.from, lang) : null;
  const to = statement.to ? statementDay(statement.to, lang) : null;
  if (from && to) return w.range(from, to);
  if (from) return w.from(from);
  if (to) return w.to(to);
  return w.allDates;
}

/** What a line says on the statement: its source, then the narration. */
export function statementDetails(
  entry: StatementEntry,
  lang: StatementLanguage,
): string {
  const source = statementText[lang].sources[entry.sourceType];
  return entry.narration ? `${source} — ${entry.narration}` : source;
}

const side = (amount: string, lang: StatementLanguage) =>
  /[1-9]/.test(amount) ? formatRs(amount, lang) : "";

/** The statement as sheet rows: heading lines, the table, closing balance. */
export function statementRows(
  statement: Statement,
  lang: StatementLanguage,
  shopName: string | null,
  now: Date = new Date(),
): string[][] {
  const w = statementText[lang];
  const c = w.columns;
  const opening = statementBalance(statement.openingBalance, lang);
  const closing = statementBalance(statement.closingBalance, lang);
  return [
    [w.title],
    ...(shopName ? [[w.shop, shopName]] : []),
    [
      w.trader,
      `${statement.trader.name} (${w.traderTypes[statement.trader.type]})`,
    ],
    [w.period, statementPeriod(statement, lang)],
    [w.printedOn, statementDay(now, lang)],
    [],
    [c.date, c.details, c.debit, c.credit, c.balance, ""],
    ["", w.openingBalance, "", "", opening.amount, opening.side],
    ...statement.data.map((entry) => {
      const balance = statementBalance(entry.balance, lang);
      return [
        statementDay(entry.entryDate, lang),
        statementDetails(entry, lang),
        side(entry.debit, lang),
        side(entry.credit, lang),
        balance.amount,
        balance.side,
      ];
    }),
    ["", w.closingBalance, "", "", closing.amount, closing.side],
    [],
    [w.legend],
  ];
}

/** `khata-rafiq-ahmad`: letters (any script) and digits, joined by "-". */
export function statementFileBase(traderName: string): string {
  const slug = traderName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `khata-${slug}` : "khata";
}

/**
 * Writes the statement to `khata-<trader>-<day>.xlsx`; an Urdu sheet reads
 * right to left. SheetJS is loaded on demand.
 */
export async function exportStatementToExcel(
  statement: Statement,
  lang: StatementLanguage,
  shopName: string | null,
): Promise<void> {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet(
    statementRows(statement, lang, shopName),
  );
  sheet["!cols"] = [
    { wch: 14 },
    { wch: 44 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 6 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, statementText[lang].sheetName);
  if (lang === "ur") book.Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(
    book,
    exportFileName(statementFileBase(statement.trader.name)),
    {
      compression: true,
    },
  );
}
