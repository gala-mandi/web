"use client";

import { useEffect, useState } from "react";

/** Seconds left of `seconds`, restarting whenever `key` changes. */
export function useCountdown(seconds: number, key: unknown = seconds): number {
  const [left, setLeft] = useState(seconds);
  const [prevKey, setPrevKey] = useState(key);

  // Restart when the key changes (e.g. a new code was sent).
  if (prevKey !== key) {
    setPrevKey(key);
    setLeft(seconds);
  }

  useEffect(() => {
    const endsAt = Date.now() + seconds * 1000;
    const id = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(next);
      if (next === 0) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [seconds, key]);

  return left;
}

/** 58 → "0:58", 258 → "4:18". */
export function formatClock(totalSeconds: number, padMinutes = false): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${padMinutes ? String(m).padStart(2, "0") : m}:${String(s).padStart(2, "0")}`;
}
