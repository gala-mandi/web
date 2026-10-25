import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/stores/session";
import { api } from "./api";

/** Sends a request through the real interceptors and returns the final config. */
async function sentConfig(): Promise<InternalAxiosRequestConfig> {
  let sent: InternalAxiosRequestConfig | undefined;
  const adapter: AxiosAdapter = async (config) => {
    sent = config;
    return { data: null, status: 200, statusText: "OK", headers: {}, config };
  };
  await api.get("/anything", { adapter });
  if (!sent) throw new Error("request was not sent");
  return sent;
}

describe("api", () => {
  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it("uses the API URL from env and sends cookies", async () => {
    const config = await sentConfig();

    expect(config.baseURL).toBe("http://localhost:4000");
    expect(config.withCredentials).toBe(true);
  });

  it("attaches the access token from the session store", async () => {
    useSessionStore.getState().setAccessToken("token-123");

    const config = await sentConfig();

    expect(config.headers.Authorization).toBe("Bearer token-123");
  });

  it("sends no Authorization header without a token", async () => {
    const config = await sentConfig();

    expect(config.headers.Authorization).toBeUndefined();
  });
});
