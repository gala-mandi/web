import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function request(path: string, withCookie = false) {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  if (withCookie) req.cookies.set("refresh_token", "x");
  return req;
}

describe("proxy", () => {
  it("redirects a protected page without the cookie to login with ?next=", () => {
    const res = proxy(request("/dashboard?tab=1"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard%3Ftab%3D1",
    );
  });

  it("lets a protected page through when the cookie exists", () => {
    const res = proxy(request("/dashboard", true));

    expect(res.headers.get("location")).toBeNull();
  });

  it("keeps public pages public", () => {
    for (const path of [
      "/login",
      "/forgot-password",
      "/accept-invite?token=abc",
      "/shop-suspended",
      "/account-disabled",
    ]) {
      expect(proxy(request(path)).headers.get("location")).toBeNull();
    }
  });

  it("sends a signed-in user from /login to /home (which picks the landing page)", () => {
    const res = proxy(request("/login", true));

    expect(res.headers.get("location")).toBe("http://localhost:3000/home");
  });

  it("passes a safe ?next= on to /home", () => {
    const res = proxy(request("/login?next=%2Fsales%3Fday%3D1", true));

    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/home?next=%2Fsales%3Fday%3D1",
    );
  });

  it("drops an off-site ?next=", () => {
    const res = proxy(request("/login?next=%2F%2Fevil.example", true));

    expect(res.headers.get("location")).toBe("http://localhost:3000/home");
  });

  it("protects /home and every panel page", () => {
    for (const path of ["/home", "/rates", "/settings", "/no-such-page"]) {
      expect(proxy(request(path)).headers.get("location")).toBe(
        `http://localhost:3000/login?next=${encodeURIComponent(path)}`,
      );
    }
  });

  it("shows /login when it explains why (e.g. session expired)", () => {
    const res = proxy(request("/login?reason=session-expired", true));

    expect(res.headers.get("location")).toBeNull();
  });
});
