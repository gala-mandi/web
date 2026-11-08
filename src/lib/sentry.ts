import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

/**
 * Sentry error tracking for the browser and the Next.js server. It is on
 * only when NEXT_PUBLIC_SENTRY_DSN is set at build time; otherwise nothing is
 * loaded or sent. Errors only: no tracing, no session replay, no source-map
 * upload. Personal data stays out: no request bodies, cookies or query
 * strings, and phone numbers, CNICs and e-mails are masked in every text.
 */
export function sentryOptions(env: {
  dsn?: string;
  environment?: string;
  vercelEnv?: string;
  release?: string;
  nodeEnv?: string;
}) {
  const dsn = env.dsn?.trim();
  if (!dsn) return null;
  return {
    dsn,
    environment: env.environment || env.vercelEnv || env.nodeEnv,
    ...(env.release && { release: env.release }),
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}

// NEXT_PUBLIC_* values are inlined at build time, so each one is read by name.
// Vercel sets NEXT_PUBLIC_VERCEL_ENV and NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.
export const sentryConfig = sentryOptions({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  nodeEnv: process.env.NODE_ENV,
});

/** Phones (03001234567, +92 300 1234567), CNICs, other 10+ digit runs, e-mails. */
const LONG_NUMBER = /\+?\d[\d\s-]{8,}\d/g;
const EMAIL = /[^\s@"'()<>,;]+@[^\s@"'()<>,;]+\.[^\s@"'()<>,;]+/g;
const SECRET_KEY =
  /pass|token|secret|cookie|authori[sz]ation|otp|cnic|phone|mobile|email|identifier/i;

export function maskText(text: string): string {
  return text.replace(EMAIL, "[email]").replace(LONG_NUMBER, "[number]");
}

function withoutQuery(url: string): string {
  const index = url.search(/[?#]/);
  return index === -1 ? url : url.slice(0, index);
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return maskText(value);
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SECRET_KEY.test(key))
      .map(([key, v]) => [key, scrubValue(v, depth + 1)]),
  );
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    const { url, method } = event.request;
    event.request = {
      ...(url && { url: withoutQuery(url) }),
      ...(method && { method }),
    };
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : {};
  if (event.message) event.message = maskText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = maskText(exception.value);
  }
  if (event.extra) event.extra = scrubValue(event.extra) as ErrorEvent["extra"];
  if (event.breadcrumbs)
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  return event;
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  const data = crumb.data;
  return {
    ...crumb,
    ...(crumb.message && { message: maskText(crumb.message) }),
    ...(data && {
      data: scrubValue({
        ...data,
        ...(typeof data.url === "string" && { url: withoutQuery(data.url) }),
        ...(typeof data.from === "string" && { from: withoutQuery(data.from) }),
        ...(typeof data.to === "string" && { to: withoutQuery(data.to) }),
      }) as Breadcrumb["data"],
    }),
  };
}
