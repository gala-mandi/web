import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { fakeAdapter, httpError, ok, owner, sessionFor } from "@/test/fake-api";
import { api, ensureSession, refreshSession } from "./api";
import { hardRedirect } from "./navigation";

vi.mock("./navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./navigation")>()),
  hardRedirect: vi.fn(),
}));

const defaultAdapter = api.defaults.adapter;

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

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("api", () => {
  beforeEach(() => {
    vi.mocked(hardRedirect).mockReset();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
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

  describe("on 401", () => {
    it("sends exactly one refresh for 3 concurrent 401s and retries all 3", async () => {
      useSessionStore.getState().setSession(sessionFor(owner, "old"));
      const fake = fakeAdapter(async (config) => {
        if (config.url === "/auth/refresh") {
          await tick();
          return ok(config, sessionFor({ ...owner, name: "Fresh" }, "new"));
        }
        if (config.headers.Authorization === "Bearer new") {
          return ok(config, { url: config.url });
        }
        throw httpError(config, 401);
      });
      api.defaults.adapter = fake.adapter;

      const results = await Promise.all([
        api.get("/a"),
        api.get("/b"),
        api.get("/c"),
      ]);

      expect(results.map((r) => r.data.url)).toEqual(["/a", "/b", "/c"]);
      expect(fake.calls.filter((c) => c.url === "/auth/refresh")).toHaveLength(
        1,
      );
      const retried = fake.calls.filter(
        (c) => c.url !== "/auth/refresh" && c.token === "new",
      );
      expect(retried.map((c) => c.url).sort()).toEqual(["/a", "/b", "/c"]);
      expect(useSessionStore.getState().accessToken).toBe("new");
      expect(useSessionStore.getState().user?.name).toBe("Fresh");
    });

    it("retries only once when the retry fails again", async () => {
      useSessionStore.getState().setSession(sessionFor(owner, "old"));
      const fake = fakeAdapter(async (config) => {
        if (config.url === "/auth/refresh")
          return ok(config, sessionFor(owner, "new"));
        throw httpError(config, 401);
      });
      api.defaults.adapter = fake.adapter;

      await expect(api.get("/a")).rejects.toMatchObject({
        response: { status: 401 },
      });
      expect(fake.calls.map((c) => c.url)).toEqual([
        "/a",
        "/auth/refresh",
        "/a",
      ]);
    });

    it("clears the session and goes to login when refresh fails", async () => {
      window.history.replaceState(null, "", "/dashboard?tab=1");
      useSessionStore.getState().setSession(sessionFor(owner, "old"));
      api.defaults.adapter = fakeAdapter(async (config) => {
        if (config.url === "/auth/refresh") {
          throw httpError(config, 401, { code: "SESSION_EXPIRED" });
        }
        throw httpError(config, 401);
      }).adapter;

      await expect(api.get("/a")).rejects.toBeDefined();

      expect(useSessionStore.getState().accessToken).toBeNull();
      expect(useSessionStore.getState().user).toBeNull();
      expect(hardRedirect).toHaveBeenCalledWith(
        "/login?reason=session-expired&next=%2Fdashboard%3Ftab%3D1",
      );
    });

    it.each([
      ["ACCOUNT_DISABLED", "/account-disabled"],
      ["TENANT_SUSPENDED", "/shop-suspended"],
    ])(
      "goes to the right page when refresh fails with 403 %s",
      async (code, page) => {
        useSessionStore.getState().setSession(sessionFor(owner, "old"));
        api.defaults.adapter = fakeAdapter(async (config) => {
          if (config.url === "/auth/refresh")
            throw httpError(config, 403, { code });
          throw httpError(config, 401);
        }).adapter;

        await expect(api.get("/a")).rejects.toBeDefined();

        expect(useSessionStore.getState().accessToken).toBeNull();
        expect(hardRedirect).toHaveBeenCalledWith(page);
      },
    );

    it("never refreshes for a 401 from login, refresh or logout", async () => {
      const fake = fakeAdapter(async (config) => {
        throw httpError(config, 401);
      });
      api.defaults.adapter = fake.adapter;

      await expect(api.post("/auth/login", {})).rejects.toBeDefined();
      await expect(api.post("/auth/logout")).rejects.toBeDefined();

      expect(fake.calls.map((c) => c.url)).toEqual([
        "/auth/login",
        "/auth/logout",
      ]);
      expect(hardRedirect).not.toHaveBeenCalled();
    });
  });

  it("ends the session on a 403 ACCOUNT_DISABLED from any request", async () => {
    useSessionStore.getState().setSession(sessionFor(owner));
    api.defaults.adapter = fakeAdapter(async (config) => {
      throw httpError(config, 403, { code: "ACCOUNT_DISABLED" });
    }).adapter;

    await expect(api.get("/auth/me")).rejects.toBeDefined();

    expect(useSessionStore.getState().user).toBeNull();
    expect(hardRedirect).toHaveBeenCalledWith("/account-disabled");
  });

  it("keeps a plain 403 (no code) as a normal error", async () => {
    useSessionStore.getState().setSession(sessionFor(owner));
    api.defaults.adapter = fakeAdapter(async (config) => {
      throw httpError(config, 403);
    }).adapter;

    await expect(api.get("/staff")).rejects.toBeDefined();

    expect(useSessionStore.getState().user).not.toBeNull();
    expect(hardRedirect).not.toHaveBeenCalled();
  });

  describe("session bootstrap", () => {
    it("restores the session with one refresh even when asked twice at once", async () => {
      const fake = fakeAdapter(async (config) =>
        ok(config, sessionFor(owner, "boot")),
      );
      api.defaults.adapter = fake.adapter;

      await Promise.all([ensureSession(), ensureSession()]);

      expect(fake.calls).toHaveLength(1);
      expect(useSessionStore.getState().accessToken).toBe("boot");
    });

    it("does not refresh when a token is already in memory", async () => {
      useSessionStore.getState().setSession(sessionFor(owner));
      const fake = fakeAdapter(async (config) => ok(config, sessionFor(owner)));
      api.defaults.adapter = fake.adapter;

      await ensureSession();

      expect(fake.calls).toHaveLength(0);
    });

    it("rejects when the refresh cookie is gone", async () => {
      api.defaults.adapter = fakeAdapter(async (config) => {
        throw httpError(config, 401, { code: "SESSION_EXPIRED" });
      }).adapter;

      await expect(refreshSession()).rejects.toMatchObject({
        response: { status: 401 },
      });
      expect(useSessionStore.getState().accessToken).toBeNull();
    });
  });
});
