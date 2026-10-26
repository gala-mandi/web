import { afterEach, describe, expect, it } from "vitest";
import { owner, sessionFor } from "@/test/fake-api";
import { selectRole, selectTenant, useSessionStore } from "./session";

describe("useSessionStore", () => {
  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it("starts without a token or user", () => {
    expect(useSessionStore.getState().accessToken).toBeNull();
    expect(useSessionStore.getState().user).toBeNull();
  });

  it("stores the session and exposes role and tenant", () => {
    useSessionStore.getState().setSession(sessionFor(owner, "abc"));

    const state = useSessionStore.getState();
    expect(state.accessToken).toBe("abc");
    expect(selectRole(state)).toBe("owner");
    expect(selectTenant(state)?.name).toBe("Demo Mandi");
  });

  it("clears everything", () => {
    useSessionStore.getState().setSession(sessionFor(owner, "abc"));
    useSessionStore.getState().clear();

    expect(useSessionStore.getState().accessToken).toBeNull();
    expect(useSessionStore.getState().user).toBeNull();
  });

  it("never writes the token to localStorage or sessionStorage", () => {
    useSessionStore.getState().setSession(sessionFor(owner, "secret-token"));

    expect(JSON.stringify({ ...localStorage })).not.toContain("secret-token");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("secret-token");
  });
});
