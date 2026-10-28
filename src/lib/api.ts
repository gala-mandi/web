import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { Session } from "@/features/auth/types";
import { toApiError } from "@/lib/api-error";
import {
  blockedPageFor,
  handleAuthFailure,
  startSession,
} from "@/lib/auth-session";
import { env } from "@/lib/env";
import { useSessionStore } from "@/stores/session";

/** The only HTTP client for the server API. */
export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  // Sends the httpOnly refresh-token cookie set by the server.
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

/** A 401 from these never triggers a refresh (they are the session itself). */
const noRefreshPaths = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/accept-invite",
];

function isNoRefreshUrl(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split("?")[0];
  return noRefreshPaths.some((p) => path === p || path.endsWith(p));
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshInFlight: Promise<Session> | null = null;

/**
 * Single-flight `POST /auth/refresh`: every caller that arrives while a refresh
 * is running waits on the same promise, so only one request is sent.
 */
export function refreshSession(): Promise<Session> {
  refreshInFlight ??= api
    .post<Session>("/auth/refresh")
    .then(({ data }) => startSession(data))
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/** On a protected page without a token: restore the session from the cookie. */
export async function ensureSession(): Promise<void> {
  const { accessToken, user } = useSessionStore.getState();
  if (accessToken && user) return;
  await refreshSession();
}

function bearerOf(config: InternalAxiosRequestConfig): string | null {
  const header = config.headers?.Authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

api.interceptors.request.use((config) => {
  const token = useSessionStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;
  const status = error.response?.status;
  if (!config || isNoRefreshUrl(config.url)) throw error;

  if (status === 403 && blockedPageFor(toApiError(error).code)) {
    handleAuthFailure(error);
    throw error;
  }

  if (status !== 401 || config._retried) throw error;
  config._retried = true;

  // Another request may already have refreshed the token while this one was
  // in flight; then retry with the new token instead of refreshing again.
  const current = useSessionStore.getState().accessToken;
  if (!current || current === bearerOf(config)) {
    try {
      await refreshSession();
    } catch (refreshError) {
      handleAuthFailure(refreshError);
      throw refreshError;
    }
  }

  return api(config);
});
