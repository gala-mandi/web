import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/navigation";
import { HOME_PATH, isPublicPath } from "@/lib/routes";

/** httpOnly cookie set by the server; the proxy can only check that it exists. */
const REFRESH_COOKIE = "refresh_token";

/**
 * Next.js 16 Proxy (formerly Middleware). Optimistic check only: the real
 * session check is the client-side refresh in `AuthGuard`.
 * - Protected pages without the cookie → `/login?next=…`
 * - `/login` with the cookie → `/home` (unless a `reason` is shown), which
 *   picks the user's landing page once their permissions are known; a safe
 *   `?next=` is passed on.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_COOKIE);

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && hasSession && !searchParams.has("reason")) {
      const url = new URL(HOME_PATH, request.url);
      const next = safeNextPath(searchParams.get("next"));
      if (next) url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files (anything with a dot).
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
