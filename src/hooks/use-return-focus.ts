"use client";

import { useRef } from "react";

/**
 * For a sheet or dialog opened from state (no `SheetTrigger`): remembers
 * what had focus when it opened and gives focus back there when it closes,
 * so a keyboard user lands on the button they started from (Radix only does
 * this for its own trigger). Spread the result on `SheetContent` /
 * `DialogContent`.
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      opener.current =
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
          ? document.activeElement
          : null;
    },
    onCloseAutoFocus: (event: Event) => {
      const target = opener.current;
      opener.current = null;
      if (target?.isConnected) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
