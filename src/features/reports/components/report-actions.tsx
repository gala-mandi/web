"use client";

import { useTranslations } from "next-intl";
import { useSheetWords } from "../use-sheet-words";
import { FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportReportToExcel, reportFileBase } from "../excel";
import type { ReportSheet } from "../sheet";
import { ReportDocument, reportPageStyle } from "./report-document";

type Action = "print" | "pdf" | "excel";

interface PrintJob {
  sheet: ReportSheet;
  printedAt: Date;
}

/**
 * Prints once the iframe's fonts (Nastaliq for Urdu names) have loaded.
 * react-to-print only applies `documentTitle` with its own print, so the
 * title ("Save as PDF" suggests it as the file name) is set here.
 */
async function printWhenReady(iframe: HTMLIFrameElement, title: string) {
  await iframe.contentDocument?.fonts?.ready;
  const page = iframe.ownerDocument;
  const before = page.title;
  page.title = title;
  if (iframe.contentDocument) iframe.contentDocument.title = title;
  // The print dialog blocks until it closes.
  iframe.contentWindow?.print();
  page.title = before;
}

export interface ReportActionsProps {
  /** The report on screen; null while it loads (the buttons wait). */
  sheet: ReportSheet | null;
  shopName: string | null;
  maundKg: string;
}

/**
 * Print, Excel and PDF of the report on screen. Print and PDF use the same
 * A4 layout through react-to-print, PDF being the print window's "Save as
 * PDF"; Excel is written with SheetJS. All three read the same model as
 * the screen, so their totals are the server's totals shown on the page.
 */
export function ReportActions({
  sheet,
  shopName,
  maundKg,
}: ReportActionsProps) {
  const words = useSheetWords();
  const t = useTranslations("reports");
  const [busy, setBusy] = useState<Action | null>(null);
  const [job, setJob] = useState<PrintJob | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const title = job ? reportFileBase(job.sheet) : "report";
  const print = useReactToPrint({
    contentRef,
    documentTitle: title,
    pageStyle: reportPageStyle(t),
    // The fonts are CSS variables on <html>; the print iframe needs them too.
    bodyClass:
      typeof document === "undefined"
        ? undefined
        : document.documentElement.className,
    print: (iframe) => printWhenReady(iframe, title),
    onPrintError: () => toast.error(t("actions.failed")),
  });

  // Print once the job's document is on the page (react-to-print copies it).
  const printPending = useRef(false);
  useEffect(() => {
    if (!job || !printPending.current) return;
    printPending.current = false;
    print();
  }, [job, print]);

  async function run(action: Action) {
    if (!sheet) return;
    if (action !== "excel") {
      if (action === "pdf") toast.info(t("actions.pdfHint"));
      printPending.current = true;
      setJob({ sheet, printedAt: new Date() });
      return;
    }
    setBusy(action);
    try {
      await exportReportToExcel(words, sheet, shopName);
    } catch {
      toast.error(t("actions.failed"));
    } finally {
      setBusy(null);
    }
  }

  const button = (action: Action, Icon: typeof Printer, label: string) => (
    <Button
      type="button"
      variant="outline"
      className="h-10 gap-2"
      disabled={!sheet || busy !== null}
      aria-busy={busy === action || undefined}
      onClick={() => void run(action)}
    >
      <Icon aria-hidden />
      {busy === action ? t("actions.preparing") : label}
    </Button>
  );

  return (
    <div
      role="group"
      aria-label={t("actions.label")}
      className="flex flex-wrap gap-2"
    >
      {button("print", Printer, t("actions.print"))}
      {button("excel", FileSpreadsheet, t("actions.excel"))}
      {button("pdf", FileDown, t("actions.pdf"))}
      {job ? (
        <div className="hidden">
          <ReportDocument
            ref={contentRef}
            sheet={job.sheet}
            shopName={shopName}
            maundKg={maundKg}
            printedAt={job.printedAt}
          />
        </div>
      ) : null}
    </div>
  );
}
