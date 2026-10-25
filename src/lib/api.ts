import axios from "axios";
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

api.interceptors.request.use((config) => {
  const token = useSessionStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
