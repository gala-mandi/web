"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ParchiBill } from "../types";
import { ParchiDesk } from "./parchi-desk";
import { ParchiDocument } from "./parchi-document";

export interface BillParchiProps {
  bill: ParchiBill;
  /** Beside the print controls, e.g. the link to the trader's khata. */
  aside?: ReactNode;
}

/**
 * The saved bill's parchi on screen exactly as it prints, with the paper
 * (A4, A5, 80 mm) and language (English, Urdu) pickers and Print. Save &
 * Print opens the bill with `?print=1`, which prints it once the shop's
 * header has loaded.
 */
export function BillParchi({ bill, aside }: BillParchiProps) {
  const t = useTranslations("parchi");
  return (
    <ParchiDesk
      docNo={bill.billNo}
      label={t("preview", { billNo: bill.billNo })}
      aside={aside}
    >
      {({ ref, shop, lang, paper, printedAt }) => (
        <ParchiDocument
          ref={ref}
          bill={bill}
          shop={shop}
          lang={lang}
          paper={paper}
          printedAt={printedAt}
          printArea
        />
      )}
    </ParchiDesk>
  );
}
