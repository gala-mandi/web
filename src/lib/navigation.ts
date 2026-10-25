let redirecting = false;

/**
 * Full page navigation, used when the session ends (memory is wiped on purpose).
 * Kept in its own module so tests can mock it.
 */
export function hardRedirect(path: string): void {
  redirecting = true;
  window.location.assign(path);
}

/** True once a hard redirect started; guards stop trying to restore the session. */
export function isRedirecting(): boolean {
  return redirecting;
}

/** Only same-origin paths are allowed as `?next=` targets. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
