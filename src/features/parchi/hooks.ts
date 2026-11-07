"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import type { Tenant } from "@/features/auth/types";
import { useShopInfo } from "@/features/panel/hooks";
import { useSettings } from "@/features/settings/hooks";
import type { Settings } from "@/features/settings/types";
import { useCan } from "@/lib/can";
import { useParchiPrefs } from "@/stores/parchi";
import {
  parchiDocumentTitle,
  parchiPageStyle,
  thermalPageRule,
} from "./parchi";
import type {
  PaperSize,
  ParchiBill,
  ParchiLanguage,
  ParchiShop,
} from "./types";

/** The parchi header and footer from the owner's Settings. */
export function shopFromSettings(settings: Settings): ParchiShop {
  const address = [settings.address, settings.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return {
    name: settings.displayName?.trim() || settings.name,
    logoUrl: settings.logoUrl,
    address: address || null,
    phone: settings.phone?.trim() || null,
    footer: settings.parchiFooter?.trim() || null,
    maundKg: settings.maundKg,
    language: settings.language,
  };
}

/** What `/auth/me` tells everyone about the shop: its name and logo. */
export function shopFromTenant(tenant: Tenant | null): ParchiShop {
  return {
    name: tenant?.name ?? "",
    logoUrl: tenant?.logoUrl ?? null,
    address: null,
    phone: null,
    footer: null,
    maundKg: "40",
    language: null,
  };
}

/**
 * The shop's parchi header and footer. `GET /settings` (parchi name,
 * address, phone, footer) needs `settings.manage`, which only the owner
 * has; managers and operators get the shop name and logo from `/auth/me`
 * until the server shares the parchi part of Settings with them.
 */
export function useParchiShop(): { shop: ParchiShop; isLoading: boolean } {
  const canReadSettings = useCan("settings.manage");
  const settings = useSettings({ enabled: canReadSettings });
  const info = useShopInfo();
  if (canReadSettings && settings.data) {
    return { shop: shopFromSettings(settings.data), isLoading: false };
  }
  return {
    shop: shopFromTenant(info.shop),
    isLoading: (canReadSettings && settings.isPending) || info.isLoading,
  };
}

/**
 * Paper and language to print with: this computer's last choice of paper;
 * the language picked on a parchi screen, else the interface language (the
 * user's choice, or the shop default from Settings).
 */
export function useParchiChoice(): {
  paper: PaperSize;
  lang: ParchiLanguage;
  setPaper: (paper: PaperSize) => void;
  setLang: (lang: ParchiLanguage) => void;
} {
  const paper = useParchiPrefs((s) => s.paper);
  const saved = useParchiPrefs((s) => s.lang);
  const setPaper = useParchiPrefs((s) => s.setPaper);
  const setLang = useParchiPrefs((s) => s.setLang);
  const locale = useLocale();
  return { paper, lang: saved ?? locale, setPaper, setLang };
}

/**
 * Prints from react-to-print's iframe once its fonts (Nastaliq for Urdu)
 * have loaded. On the 80 mm roll the page is made exactly as long as the
 * parchi, so a long bill is never cut into sheets.
 */
export async function printParchiFrame(
  iframe: HTMLIFrameElement,
  paper: PaperSize,
): Promise<void> {
  const doc = iframe.contentDocument;
  await doc?.fonts?.ready;
  if (doc && paper === "thermal80") {
    const node = doc.querySelector<HTMLElement>("[data-parchi]");
    if (node) {
      const style = doc.createElement("style");
      style.textContent = thermalPageRule(node.getBoundingClientRect().height);
      doc.head.appendChild(style);
    }
  }
  iframe.contentWindow?.print();
}

/** react-to-print set up for one parchi on one paper. */
export function useParchiPrint({
  contentRef,
  paper,
  lang,
  billNo,
  documentTitle,
  numberLabel,
}: {
  contentRef: RefObject<HTMLElement | null>;
  paper: PaperSize;
  lang: ParchiLanguage;
  billNo: string | null;
  /** "Save as PDF" file name; default `parchi-<billNo>`. */
  documentTitle?: string;
  /** Before the number at the top of later sheets; default "Bill no". */
  numberLabel?: string;
}) {
  const t = useTranslations("parchi");
  return useReactToPrint({
    contentRef,
    documentTitle:
      documentTitle ?? (billNo ? parchiDocumentTitle(billNo) : "parchi"),
    pageStyle: parchiPageStyle(paper, lang, billNo ?? "", numberLabel),
    // The fonts are CSS variables on <html>; the print iframe needs them too.
    bodyClass:
      typeof document === "undefined"
        ? undefined
        : document.documentElement.className,
    print: (iframe) => printParchiFrame(iframe, paper),
    onPrintError: () => toast.error(t("failed")),
  });
}

export interface ReprintJob {
  bill: ParchiBill;
  printedAt: Date;
}

/**
 * "Reprint" in a list: loads the whole bill, puts its parchi (with the
 * remembered paper and language) off screen and prints it. `job` is what
 * to render into `contentRef`.
 */
export function useReprint(load: (id: string) => Promise<ParchiBill>) {
  const t = useTranslations("parchi");
  const { shop } = useParchiShop();
  const { paper, lang } = useParchiChoice();
  const [job, setJob] = useState<ReprintJob | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const contentRef = useRef<HTMLElement>(null);
  const print = useParchiPrint({
    contentRef,
    paper,
    lang,
    billNo: job?.bill.billNo ?? null,
  });

  // Print once the job's parchi is on the page (react-to-print copies it).
  const printPending = useRef(false);
  useEffect(() => {
    if (!job || !printPending.current) return;
    printPending.current = false;
    print();
  }, [job, print]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  /** Stable, so a memoised table column can hold it. */
  const reprint = useCallback(
    async (id: string) => {
      setPendingId(id);
      try {
        const bill = await loadRef.current(id);
        printPending.current = true;
        setJob({ bill, printedAt: new Date() });
      } catch {
        toast.error(t("failed"));
      } finally {
        setPendingId(null);
      }
      // Stable per language: a memoised table column can hold it.
    },
    [t],
  );

  return { reprint, pendingId, job, contentRef, shop, paper, lang };
}
