import type { ShopSubscription } from "./types";

/** The plan every new shop starts on (server: `TRIAL_PLAN_NAME`). */
export const TRIAL_PLAN_NAME = "Trial";
/** A paid plan gets the banner this many days before it ends. */
export const EXPIRING_DAYS = 7;

export type BannerKind = "trial" | "expiring" | "grace" | "read_only";

export interface Banner {
  kind: BannerKind;
  /** Trial and expiring can be hidden for the day; grace and read-only can't. */
  dismissible: boolean;
}

/** Which banner the panel shows, if any. */
export function bannerFor(shop: ShopSubscription | undefined): Banner | null {
  if (!shop) return null;
  const sub = shop.subscription;
  if (shop.state === "read_only")
    return { kind: "read_only", dismissible: false };
  if (!sub) return null;
  if (sub.state === "grace") return { kind: "grace", dismissible: false };
  if (sub.plan.name === TRIAL_PLAN_NAME) {
    return { kind: "trial", dismissible: true };
  }
  if (sub.daysLeft <= EXPIRING_DAYS) {
    return { kind: "expiring", dismissible: true };
  }
  return null;
}

const DISMISS_KEY = "gm.plan-banner.hidden-on";

/** The Pakistan day the banner was hidden on, if storage is available. */
export function hiddenOn(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function hideFor(day: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, day);
  } catch {
    // Private mode or blocked storage: it just shows again on reload.
  }
  for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`: re-read when the banner is hidden. */
export function subscribeHidden(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
