"use client";

import type { ColumnVisibilityState } from "@tanstack/react-table";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSessionStore } from "@/stores/session";

/** localStorage key of one user's hidden columns for one table. */
export function columnVisibilityKey(userId: string, tableId: string): string {
  return `galla:dt-cols:${userId}:${tableId}`;
}

// Used when localStorage throws (private mode, blocked, full): the choice
// still holds for this tab.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  const kept = memory.get(key);
  if (kept !== undefined) return kept;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key);
    else memory.clear();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function parse(raw: string | null): ColumnVisibilityState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    return Object.fromEntries(
      Object.entries(value).filter(([, v]) => typeof v === "boolean"),
    ) as ColumnVisibilityState;
  } catch {
    return null;
  }
}

export interface ColumnVisibility {
  columnVisibility: ColumnVisibilityState;
  onColumnVisibilityChange: (next: ColumnVisibilityState) => void;
}

/**
 * Which columns of a table are shown, remembered per signed-in user and table
 * in localStorage (`galla:dt-cols:<userId>:<tableId>`). Works when storage is
 * unavailable; the server render uses `defaults`.
 */
export function useColumnVisibility(
  tableId: string,
  defaults: ColumnVisibilityState = {},
): ColumnVisibility {
  const userId = useSessionStore((state) => state.user?.id ?? "anonymous");
  const key = columnVisibilityKey(userId, tableId);

  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  // `defaults` is usually an inline object; compare it by value.
  const defaultsKey = JSON.stringify(defaults);
  const columnVisibility = useMemo(
    () => ({ ...parse(defaultsKey), ...parse(raw) }),
    [raw, defaultsKey],
  );

  const onColumnVisibilityChange = useCallback(
    (next: ColumnVisibilityState) => {
      write(key, JSON.stringify(next));
    },
    [key],
  );

  return { columnVisibility, onColumnVisibilityChange };
}
