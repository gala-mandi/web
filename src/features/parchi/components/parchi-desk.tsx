"use client";

import { Printer } from "lucide-react";
import {
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrintOnce } from "@/hooks/use-print-once";
import { cn } from "@/lib/utils";
import { useParchiChoice, useParchiPrint, useParchiShop } from "../hooks";
import { paperText, parchiLanguageNames, parchiText } from "../text";
import {
  type PaperSize,
  paperSizes,
  type ParchiLanguage,
  parchiLanguages,
  type ParchiShop,
} from "../types";

/** What a desk hands the document it shows and prints. */
export interface ParchiDeskDocument {
  ref: Ref<HTMLElement>;
  shop: ParchiShop;
  lang: ParchiLanguage;
  paper: PaperSize;
  printedAt: Date;
}

export interface ParchiDeskProps {
  /** The bill or voucher number (print title, top of later sheets). */
  docNo: string;
  /** The section's accessible name, e.g. "Parchi PUR-…". */
  label: string;
  /** "Save as PDF" file name; default `parchi-<docNo>`. */
  documentTitle?: string;
  /** Before the number on later sheets, in the paper's language. */
  numberLabel?: (lang: ParchiLanguage) => string;
  /** The Print button's text; default "Print parchi". */
  printLabel?: string;
  /** Beside the print controls, e.g. the link to the trader's khata. */
  aside?: ReactNode;
  /** The printable document, given the shop, paper, language and time. */
  children: (doc: ParchiDeskDocument) => ReactNode;
}

/**
 * A saved document (bill parchi, payment voucher) on screen exactly as it
 * prints, with the paper (A4, A5, 80 mm) and language (English, Urdu)
 * pickers and Print. `?print=1` prints it once the shop's header has
 * loaded (Save & Print).
 */
export function ParchiDesk({
  docNo,
  label,
  documentTitle,
  numberLabel,
  printLabel = parchiText.print,
  aside,
  children,
}: ParchiDeskProps) {
  const t = parchiText;
  const paperId = useId();
  const languageId = useId();
  const { shop, isLoading } = useParchiShop();
  const { paper, lang, setPaper, setLang } = useParchiChoice(shop);
  const [printedAt, setPrintedAt] = useState(() => new Date());
  const contentRef = useRef<HTMLElement>(null);
  const print = useParchiPrint({
    contentRef,
    paper,
    lang,
    billNo: docNo,
    documentTitle,
    numberLabel: numberLabel?.(lang),
  });

  // Print after the "printed on" time is on the document.
  const printPending = useRef(false);
  useEffect(() => {
    if (!printPending.current) return;
    printPending.current = false;
    print();
  }, [printedAt, print]);

  function printNow() {
    printPending.current = true;
    setPrintedAt(new Date());
  }

  usePrintOnce(printNow, !isLoading);

  return (
    <section aria-label={label} className="flex flex-col gap-4">
      <div className="rounded-card bg-card flex flex-wrap items-end gap-3 border p-4 print:hidden">
        <Picker
          id={paperId}
          label={t.paperLabel}
          value={paper}
          options={paperSizes.map((value) => ({
            value,
            label: paperText[value],
          }))}
          onChange={(value) => setPaper(value as PaperSize)}
          className="w-40"
        />
        <Picker
          id={languageId}
          label={t.languageLabel}
          value={lang}
          options={parchiLanguages.map((value) => ({
            value,
            label: parchiLanguageNames[value],
            lang: value,
          }))}
          onChange={(value) => setLang(value as ParchiLanguage)}
          className="w-32"
        />
        <Button
          type="button"
          size="lg"
          className="h-10 gap-2 px-4 font-semibold"
          onClick={printNow}
        >
          <Printer aria-hidden />
          {printLabel}
        </Button>
        {aside ? <div className="ms-auto self-center">{aside}</div> : null}
      </div>

      <div
        data-testid="parchi-desk"
        className="rounded-card bg-surface-muted overflow-x-auto border p-4 sm:p-8 print:overflow-visible print:border-0 print:bg-transparent print:p-0"
      >
        <p className="text-muted-foreground mb-3 text-center text-xs print:hidden">
          {t.previewHint}
        </p>
        <div className="mx-auto w-fit shadow-[0_1px_2px_rgb(30_27_46/0.08),0_18px_40px_-18px_rgb(30_27_46/0.35)] print:shadow-none">
          {children({ ref: contentRef, shop, lang, paper, printedAt })}
        </div>
      </div>
    </section>
  );
}

function Picker({
  id,
  label,
  value,
  options,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string; lang?: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className={cn(
            "rounded-field bg-card data-[size=default]:h-10",
            className,
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              lang={option.lang}
              className={option.lang === "ur" ? "font-urdu" : undefined}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
