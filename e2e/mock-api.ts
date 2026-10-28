import type { BrowserContext, Page, Request, Route } from "@playwright/test";
import { rolePermissions } from "../src/test/permissions";

export { rolePermissions };

export const API = "http://localhost:4000";

export const owner = {
  id: "u1",
  name: "Haji Aslam",
  phone: "03000000002",
  email: null,
  role: "owner",
  permissions: rolePermissions.owner,
  tenantId: "t1",
  mustChangePassword: false,
  tenant: { id: "t1", name: "Demo Mandi", logoUrl: null, status: "active" },
};

export const operator = {
  ...owner,
  id: "u3",
  name: "Bilal",
  phone: "03000000004",
  role: "operator",
  permissions: rolePermissions.operator,
};

export type Reply = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};
type Handler = (request: Request) => Reply | Promise<Reply>;

function cors(origin: string | null): Record<string, string> {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, content-type, accept",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-expose-headers": "retry-after, x-ratelimit-remaining",
  };
}

/**
 * Mocks one API endpoint so CI needs no server. Returns the requests it
 * answered (CORS preflights are not counted).
 */
export async function mockEndpoint(
  page: Page,
  method: string,
  path: string,
  handler: Handler,
) {
  const seen: Request[] = [];
  await page.route(`${API}${path}`, async (route: Route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (request.method() !== method) {
      await route.fallback();
      return;
    }
    seen.push(request);
    const reply = await handler(request);
    await route.fulfill({
      status: reply.status,
      headers: { ...headers, ...reply.headers },
      contentType: "application/json",
      body: reply.body === undefined ? "" : JSON.stringify(reply.body),
    });
  });
  return seen;
}

export function session(accessToken: string, user: object = owner) {
  return { accessToken, expiresIn: 900, user };
}

/** Does what the server's `Set-Cookie: refresh_token=…` does. */
export async function setRefreshCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: "refresh_token",
      value: "test-refresh",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export function bearer(request: Request): string | null {
  const header = request.headers()["authorization"];
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}
