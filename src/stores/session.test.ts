import { afterEach, describe, expect, it } from "vitest";
import { useSessionStore } from "./session";

describe("useSessionStore", () => {
  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it("starts without a token", () => {
    expect(useSessionStore.getState().accessToken).toBeNull();
  });

  it("sets and clears the access token", () => {
    useSessionStore.getState().setAccessToken("abc");
    expect(useSessionStore.getState().accessToken).toBe("abc");

    useSessionStore.getState().clear();
    expect(useSessionStore.getState().accessToken).toBeNull();
  });

  it("never writes the token to localStorage", () => {
    useSessionStore.getState().setAccessToken("secret-token");

    expect(JSON.stringify({ ...localStorage })).not.toContain("secret-token");
  });
});
