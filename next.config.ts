import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Security headers for every page. The API origin is the only other place the
 * browser talks to (it is inlined at build time, like NEXT_PUBLIC_API_URL).
 * The CSP is left out of `next dev`, which needs eval for Fast Refresh;
 * `next build` / `next start` (and the Playwright tests) always send it.
 * Scripts keep 'unsafe-inline': Next's own inline bootstrap scripts need it
 * unless every page is rendered per request with a nonce, which would turn
 * off the prerendered (cached) pages.
 */
function securityHeaders(): { key: string; value: string }[] {
  const api = process.env.NEXT_PUBLIC_API_URL
    ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
    : "";
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    // Shop logos come from the API (/uploads) or ImageKit's default URL
    // endpoint; add a custom ImageKit domain here if one is set up.
    `img-src 'self' data: blob: https://ik.imagekit.io ${api}`,
    "font-src 'self' data:",
    `connect-src 'self' ${api}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  return [
    ...(process.env.NODE_ENV === "production"
      ? [{ key: "Content-Security-Policy", value: csp }]
      : []),
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ];
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Messages per language from `src/i18n/request.ts` (no locale in the URL).
const withNextIntl = createNextIntlPlugin({
  experimental: { createMessagesDeclaration: "./messages/en.json" },
});

export default withNextIntl(nextConfig);
