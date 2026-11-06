"use client";

import { type KeyboardEvent, useEffect, useRef } from "react";

/**
 * The keyboard flow of a parchi form (purchase or sale): Enter walks the
 * item cells, Ctrl+S saves and Ctrl+P saves and prints.
 */

/** Marks the inputs where Enter moves on (bags, weight, rate). */
export const ENTER_CELL = "data-enter-cell";

/** What Enter walks through, in page order: also each commodity button. */
const cellsOf = (idPrefix: string) =>
  `[${ENTER_CELL}], button[id^="${idPrefix}-item-"][id$="-commodity"]`;

/**
 * Enter walks commodity → bags → weight → rate → the next row; Shift+Enter
 * goes back. Enter on the commodity button is left alone (it opens its
 * search). `onPastLast` runs for Enter on the last cell.
 */
export function walkItemsOnEnter(
  event: KeyboardEvent<HTMLElement>,
  idPrefix: string,
  onPastLast: () => void,
) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
  const target = event.target as HTMLElement;
  if (!target.hasAttribute(ENTER_CELL)) return;
  event.preventDefault();
  const cells = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(cellsOf(idPrefix)),
  );
  const next = cells.indexOf(target) + (event.shiftKey ? -1 : 1);
  if (next >= 0 && next < cells.length) cells[next].focus();
  else if (next >= cells.length) onPastLast();
}

/**
 * Ctrl+S (or ⌘S) calls `onSave("save")`, Ctrl+P `onSave("print")` instead
 * of printing the form. Ignored inside dialogs and popovers (the quick-add
 * trader sheet has its own form). Always calls the latest `onSave`.
 */
export function useSaveShortcuts(onSave: (intent: "save" | "print") => void) {
  const latest = useRef(onSave);
  useEffect(() => {
    latest.current = onSave;
  });

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== "s" && key !== "p") return;
      const target = event.target as Element | null;
      if (target?.closest?.("[role=dialog]")) return;
      event.preventDefault();
      latest.current(key === "p" ? "print" : "save");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
