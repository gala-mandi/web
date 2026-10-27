import type { Session, User } from "@/features/auth/types";
import { toApiError } from "@/lib/api-error";
import { hardRedirect } from "@/lib/navigation";
import { getQueryClient } from "@/lib/query-client";
import { canOpenPath, isPublicPath, landingPathFor } from "@/lib/routes";
import { useSessionStore } from "@/stores/session";

/** 403 codes that end the session and send the user to an explanation page. */
export const blockedPages = {
  ACCOUNT_DISABLED: "/account-disabled",
  TENANT_SUSPENDED: "/shop-suspended",
} as const;

export type BlockedCode = keyof typeof blockedPages;

export function blockedPageFor(code: string | undefined): string | null {
  if (code && code in blockedPages) return blockedPages[code as BlockedCode];
  return null;
}

/** Stores a session from login or refresh (memory only). */
export function startSession(session: Session): Session {
  useSessionStore.getState().setSession(session);
  return session;
}

/**
 * Where to go right after a successful sign-in: the `?next=` page if the user
 * may open it, otherwise their landing page (first menu page they may open:
 * `/dashboard` for owners and managers, `/rates` for operators).
 */
export function homePathFor(user: User, next: string | null): string {
  if (user.mustChangePassword) return "/change-password";
  if (next && canOpenPath(user, next)) return next;
  return landingPathFor(user);
}

/** Clears everything the browser knows about the user. */
export function clearSession(): void {
  useSessionStore.getState().clear();
  getQueryClient().clear();
}

/**
 * Called when the session cannot be restored (refresh failed, or a 403 code
 * says the account or shop is blocked). Clears the session and leaves the page.
 */
export function handleAuthFailure(error: unknown): void {
  clearSession();

  const blocked = blockedPageFor(toApiError(error).code);
  if (blocked) {
    hardRedirect(blocked);
    return;
  }

  const params = new URLSearchParams({ reason: "session-expired" });
  const { pathname, search } = window.location;
  if (!isPublicPath(pathname)) params.set("next", pathname + search);
  hardRedirect(`/login?${params.toString()}`);
}
