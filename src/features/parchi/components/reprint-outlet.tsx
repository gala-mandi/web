"use client";

import type { useReprint } from "../hooks";
import { ParchiDocument } from "./parchi-document";

/**
 * Where a list's "Reprint" puts the parchi it prints: off screen (react-to-
 * print copies it into its own print frame), never shown in the list.
 */
export function ReprintOutlet({
  reprint,
}: {
  reprint: ReturnType<typeof useReprint>;
}) {
  const { job, contentRef, shop, paper, lang } = reprint;
  if (!job) return null;
  return (
    <div className="hidden" data-testid="reprint-outlet">
      <ParchiDocument
        ref={contentRef}
        bill={job.bill}
        shop={shop}
        lang={lang}
        paper={paper}
        printedAt={job.printedAt}
      />
    </div>
  );
}
