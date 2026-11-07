"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

/**
 * "Save & Print" opens a saved bill's page with `?print=1`: call `print`
 * once `ready` (e.g. the shop's parchi header has loaded), then drop the
 * flag so a reload doesn't print again.
 */
export function usePrintOnce(print: () => void, ready = true) {
  const [flag, setFlag] = useQueryState("print", parseAsString);
  const printed = useRef(false);
  const printRef = useRef(print);
  useEffect(() => {
    printRef.current = print;
  });

  useEffect(() => {
    if (flag !== "1" || printed.current || !ready) return;
    printed.current = true;
    // After this commit: on a fresh navigation the router may not have
    // written the new URL yet, and nuqs would see no flag to drop.
    setTimeout(() => {
      void setFlag(null, { history: "replace" });
    }, 0);
    printRef.current();
  }, [flag, ready, setFlag]);
}
