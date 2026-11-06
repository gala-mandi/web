"use client";

import { FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { karachiToday } from "@/lib/format";
import { selectTenant, useSessionStore } from "@/stores/session";
import { useFullStatementLoader } from "../hooks";
import { exportStatementToExcel, statementFileBase } from "../statement";
import {
  ledgerText,
  type StatementLanguage,
  statementLanguageNames,
  statementLanguages,
} from "../text";
import type { Statement } from "../types";
import { StatementDocument, statementPageStyle } from "./statement-document";

const t = ledgerText.statement;

type Action = "print" | "pdf" | "excel";

interface PrintJob {
  statement: Statement;
  lang: StatementLanguage;
  printedAt: Date;
}

/** Prints once the iframe's fonts (Nastaliq for Urdu) have loaded. */
async function printWhenReady(iframe: HTMLIFrameElement) {
  await iframe.contentDocument?.fonts?.ready;
  iframe.contentWindow?.print();
}

export interface StatementActionsProps {
  traderId: string;
  from: string | null;
  to: string | null;
}

/**
 * Statement language, Print, Excel and PDF. Each loads the whole period
 * (every page, not only the one on screen). Print and PDF go through
 * react-to-print, PDF being the print window's "Save as PDF" (a browser
 * PDF keeps Urdu shaped correctly); Excel is written with SheetJS.
 */
export function StatementActions({
  traderId,
  from,
  to,
}: StatementActionsProps) {
  const languageId = useId();
  const [lang, setLang] = useState<StatementLanguage>("en");
  const [busy, setBusy] = useState<Action | null>(null);
  const [job, setJob] = useState<PrintJob | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shopName = useSessionStore(selectTenant)?.name ?? null;
  const loadAll = useFullStatementLoader();

  const print = useReactToPrint({
    contentRef,
    documentTitle: job
      ? `${statementFileBase(job.statement.trader.name)}-${karachiToday()}`
      : "khata",
    pageStyle: statementPageStyle(job?.lang ?? lang),
    // The fonts are CSS variables on <html>; the print iframe needs them too.
    bodyClass:
      typeof document === "undefined"
        ? undefined
        : document.documentElement.className,
    print: printWhenReady,
    onPrintError: () => toast.error(t.failed),
  });

  // Print once the job's document is on the page (react-to-print copies it).
  const printPending = useRef(false);
  useEffect(() => {
    if (!job || !printPending.current) return;
    printPending.current = false;
    print();
  }, [job, print]);

  async function run(action: Action) {
    setBusy(action);
    try {
      const statement = await loadAll(traderId, {
        from: from ?? undefined,
        to: to ?? undefined,
      });
      if (action === "excel") {
        await exportStatementToExcel(statement, lang, shopName);
      } else {
        if (action === "pdf") toast.info(t.pdfHint);
        printPending.current = true;
        setJob({ statement, lang, printedAt: new Date() });
      }
    } catch {
      toast.error(t.failed);
    } finally {
      setBusy(null);
    }
  }

  const button = (action: Action, Icon: typeof Printer, label: string) => (
    <Button
      type="button"
      variant="outline"
      className="h-10 gap-2"
      disabled={busy !== null}
      aria-busy={busy === action || undefined}
      onClick={() => void run(action)}
    >
      <Icon aria-hidden />
      {busy === action ? t.preparing : label}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={languageId} className="text-[13px] font-semibold">
          {t.languageLabel}
        </label>
        <Select
          value={lang}
          onValueChange={(value) => setLang(value as StatementLanguage)}
        >
          <SelectTrigger
            id={languageId}
            className="rounded-field bg-card data-[size=default]:h-10 w-32"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {statementLanguages.map((value) => (
              <SelectItem
                key={value}
                value={value}
                lang={value}
                className={value === "ur" ? "font-urdu" : undefined}
              >
                {statementLanguageNames[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {button("print", Printer, t.print)}
      {button("excel", FileSpreadsheet, t.excel)}
      {button("pdf", FileDown, t.pdf)}

      {job ? (
        <div className="hidden">
          <StatementDocument
            ref={contentRef}
            statement={job.statement}
            lang={job.lang}
            shopName={shopName}
            printedAt={job.printedAt}
          />
        </div>
      ) : null}
    </div>
  );
}
