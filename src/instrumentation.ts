import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "@/lib/sentry";

/** Server-side error tracking (Node and edge); off without a DSN. */
export function register() {
  if (sentryConfig) Sentry.init(sentryConfig);
}

/** Errors while rendering on the server; a no-op when Sentry is off. */
export const onRequestError = Sentry.captureRequestError;
