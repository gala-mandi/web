import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "@/lib/sentry";

// Browser error tracking; nothing runs without NEXT_PUBLIC_SENTRY_DSN.
if (sentryConfig) Sentry.init(sentryConfig);
