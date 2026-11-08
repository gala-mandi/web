"use client";

import { useState } from "react";

/**
 * For a sheet or dialog opened from state (no `SheetTrigger`): remembers
 * what had focus when `open` turned true and gives focus back there when it
 * closes, so a keyboard user lands on the button they started from (Radix
 * only does this for its own trigger). Spread the result on `SheetContent`
 * / `DialogContent`.
 */
export function useReturnFocus(open: boolean) {
  const [wasOpen, setWasOpen] = useState(open);
  // A dialog mounted already open (rendered only while it shows) reads
  // the focus on its first render.
  const [opener, setOpener] = useState<HTMLElement | null>(() =>
    open ? focusOrigin() : null,
  );
  // Read while rendering the open state: before the sheet mounts and a
  // field inside it takes focus (autoFocus).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpener(focusOrigin());
  }
  return {
    onCloseAutoFocus: (event: Event) => {
      if (opener?.isConnected) {
        event.preventDefault();
        opener.focus();
      }
    },
  };
}

/** The focused element; for an item of a dropdown menu, the menu's button. */
function focusOrigin(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) return null;
  const menu = active.closest<HTMLElement>("[role=menu]");
  if (menu?.id) {
    const trigger = document.querySelector<HTMLElement>(
      `[aria-controls="${CSS.escape(menu.id)}"]`,
    );
    if (trigger) return trigger;
  }
  return active;
}
