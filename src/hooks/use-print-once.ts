"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

/**
 * "Save & Print" opens a saved bill's page with `?print=1`: print once, then
 * drop the flag so a reload doesn't print again. The global print CSS
 * prints only the page's `[data-print-area]`.
 */
export function usePrintOnce() {
  const [print, setPrint] = useQueryState("print", parseAsString);
  const printed = useRef(false);

  useEffect(() => {
    if (print !== "1" || printed.current) return;
    printed.current = true;
    void setPrint(null, { history: "replace" });
    window.print();
  }, [print, setPrint]);
}
