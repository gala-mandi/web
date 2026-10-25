import { isAxiosError } from "axios";

export interface FieldError {
  field: string;
  message: string;
}

/** The error body the server always sends. */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  errors?: FieldError[];
  code?: string;
}

export interface ApiError {
  /** 0 when the request never got a response (network down, timeout). */
  status: number;
  code: string | undefined;
  message: string | undefined;
  errors: FieldError[];
  headers: Record<string, string | undefined>;
}

function isErrorBody(data: unknown): data is Partial<ApiErrorBody> {
  return typeof data === "object" && data !== null;
}

/** Reads any thrown value into one predictable shape. */
export function toApiError(error: unknown): ApiError {
  if (!isAxiosError(error) || !error.response) {
    return {
      status: 0,
      code: undefined,
      message: undefined,
      errors: [],
      headers: {},
    };
  }
  const { status, data, headers } = error.response;
  const body = isErrorBody(data) ? data : {};
  const flatHeaders: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    flatHeaders[key.toLowerCase()] =
      value === undefined || value === null ? undefined : String(value);
  }
  return {
    status,
    code: typeof body.code === "string" ? body.code : undefined,
    message: typeof body.message === "string" ? body.message : undefined,
    errors: Array.isArray(body.errors) ? body.errors : [],
    headers: flatHeaders,
  };
}

/** Seconds from a `Retry-After` header (seconds or HTTP date). */
export function retryAfterSeconds(
  error: ApiError,
  fallback = 60,
  now = Date.now(),
): number {
  const raw = error.headers["retry-after"];
  if (!raw) return fallback;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(raw);
  if (Number.isNaN(date)) return fallback;
  return Math.max(0, Math.ceil((date - now) / 1000));
}

/**
 * Attempts left from the throttler header `X-RateLimit-Remaining` (or a named
 * variant such as `X-RateLimit-Remaining-login`).
 * Returns null when the server did not send (or CORS did not expose) one.
 */
export function remainingAttempts(error: ApiError): number | null {
  const key = Object.keys(error.headers).find(
    (name) =>
      name === "x-ratelimit-remaining" ||
      name.startsWith("x-ratelimit-remaining-"),
  );
  if (!key) return null;
  const value = Number(error.headers[key]);
  return Number.isInteger(value) && value >= 0 ? value : null;
}
