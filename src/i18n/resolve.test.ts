import { describe, expect, it } from "vitest";
import {
  LAST_LOCALE_COOKIE,
  localeSources,
  resolveLocale,
  shopLocaleCookie,
  USER_COOKIE,
  userLocaleCookie,
} from "./resolve";

const jar =
  (cookies: Record<string, string>) =>
  (name: string): string | undefined =>
    cookies[name];

describe("resolveLocale", () => {
  it("prefers the user's own choice, then the shop default, then this browser's last, then English", () => {
    expect(resolveLocale({ user: "ur", shop: "en", last: "en" })).toBe("ur");
    expect(resolveLocale({ user: "en", shop: "ur", last: "ur" })).toBe("en");
    expect(resolveLocale({ user: null, shop: "ur", last: "en" })).toBe("ur");
    expect(resolveLocale({ user: null, shop: null, last: "ur" })).toBe("ur");
    expect(resolveLocale({})).toBe("en");
  });

  it("skips values that aren't a supported language", () => {
    expect(resolveLocale({ user: "fr", shop: "xx", last: "ur" })).toBe("ur");
    expect(resolveLocale({ user: "", last: "de" })).toBe("en");
  });
});

describe("localeSources", () => {
  const userId = "4b1f6f9e-2c8a-4f0e-9a51-0d2f1c2b7a10";

  it("reads the signed-in user's choice and shop default from their own cookies", () => {
    const get = jar({
      [USER_COOKIE]: userId,
      [userLocaleCookie(userId)]: "ur",
      [shopLocaleCookie(userId)]: "en",
      [LAST_LOCALE_COOKIE]: "en",
    });
    expect(localeSources(get)).toEqual({ user: "ur", shop: "en", last: "en" });
    expect(resolveLocale(localeSources(get))).toBe("ur");
  });

  it("uses the shop default for a user who never chose", () => {
    const get = jar({
      [USER_COOKIE]: userId,
      [shopLocaleCookie(userId)]: "ur",
      [LAST_LOCALE_COOKIE]: "en",
    });
    expect(resolveLocale(localeSources(get))).toBe("ur");
  });

  it("on the sign-in screens (no user) falls back to the last language of this browser", () => {
    const get = jar({
      // Another user's choice on this browser must not leak.
      [userLocaleCookie(userId)]: "en",
      [LAST_LOCALE_COOKIE]: "ur",
    });
    expect(localeSources(get)).toEqual({ user: null, shop: null, last: "ur" });
    expect(resolveLocale(localeSources(get))).toBe("ur");
    expect(resolveLocale(localeSources(jar({})))).toBe("en");
  });

  it("ignores a user id that isn't safe in a cookie name", () => {
    const get = jar({ [USER_COOKIE]: "a;b=c", [LAST_LOCALE_COOKIE]: "en" });
    expect(localeSources(get).user).toBeNull();
  });
});
