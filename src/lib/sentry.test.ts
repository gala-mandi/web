import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import {
  maskText,
  scrubBreadcrumb,
  scrubEvent,
  sentryConfig,
  sentryOptions,
} from "./sentry";

describe("sentryOptions", () => {
  it("is off without a DSN (tests and local dev)", () => {
    expect(sentryConfig).toBeNull();
    expect(sentryOptions({ dsn: "" })).toBeNull();
  });

  it("sends errors only, with environment and release", () => {
    const options = sentryOptions({
      dsn: "https://key@o1.ingest.sentry.io/2",
      vercelEnv: "production",
      release: "abc123",
      nodeEnv: "production",
    });

    expect(options).toMatchObject({
      dsn: "https://key@o1.ingest.sentry.io/2",
      environment: "production",
      release: "abc123",
      dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
    });
    expect(options).not.toHaveProperty("tracesSampleRate");
    expect(options).not.toHaveProperty("integrations");
  });

  it("prefers NEXT_PUBLIC_SENTRY_ENVIRONMENT", () => {
    expect(
      sentryOptions({
        dsn: "https://k@o1.ingest.sentry.io/2",
        environment: "pk",
        vercelEnv: "preview",
      })?.environment,
    ).toBe("pk");
  });
});

describe("scrubbing", () => {
  it("masks phone numbers, CNICs and e-mails", () => {
    expect(maskText("call 0300-1234567 or a@b.pk, CNIC 35202-1234567-1")).toBe(
      "call [number] or [email], CNIC [number]",
    );
  });

  it("drops request data and query strings from events", () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        url: "https://web.example.com/traders?search=03001234567",
        method: "GET",
        headers: { Cookie: "x" },
        query_string: "search=03001234567",
      },
      user: { id: "u1", email: "a@b.pk" },
      exception: { values: [{ value: "No trader 03001234567" }] },
    } as ErrorEvent);

    expect(event.request).toEqual({
      url: "https://web.example.com/traders",
      method: "GET",
    });
    expect(event.user).toEqual({ id: "u1" });
    expect(event.exception?.values?.[0].value).toBe("No trader [number]");
  });

  it("cleans breadcrumbs (navigation and fetch URLs, secret fields)", () => {
    expect(
      scrubBreadcrumb({
        category: "navigation",
        data: { from: "/traders?search=03001234567", to: "/login", token: "t" },
      }),
    ).toEqual({
      category: "navigation",
      data: { from: "/traders", to: "/login" },
    });
  });
});
