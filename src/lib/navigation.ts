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

const SAME_ORIGIN = "http://same-origin.invalid";

/**
 * Only same-origin paths are allowed as `?next=` targets. Browsers drop tabs
 * and line breaks from URLs and read a backslash as `/`, so "/<tab>/evil.com"
 * would leave the site: the path is resolved the way the browser will and
 * must stay on this origin.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  // Control characters (tab, newline, …), spaces and backslashes never
  // appear in our own paths.
  if (/[\u0000-\u0020\u007f\\]/.test(next)) return null;
  try {
    if (new URL(next, SAME_ORIGIN).origin !== SAME_ORIGIN) return null;
  } catch {
    return null;
  }
  return next;
}
