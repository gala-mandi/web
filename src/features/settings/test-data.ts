import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { httpError, ok, owner } from "@/test/fake-api";
import type { Settings } from "./types";

/** Test data only: a shop as `GET /settings` returns it. */
export function shopSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    name: "Demo Mandi",
    phone: "03000000002",
    email: null,
    address: "Shop 12, Grain Market",
    city: "Okara",
    logoUrl: null,
    displayName: null,
    parchiFooter: null,
    defaultCommissionPct: "2.50",
    marketFeePct: "0.00",
    labourPerBag: "15.00",
    defaultUnit: "maund",
    maundKg: "40.000",
    billPrefix: null,
    financialYearStart: "2026-07-01",
    language: "en",
    updatedAt: "2026-10-28T10:00:00.000Z",
    ...overrides,
  };
}

export const LOGO_URL = "http://localhost:4000/uploads/t1/logo.png";

/** "2.5" → "2.50", like the server's numeric columns. */
function fixed(value: unknown, places: number): string {
  const [whole, fraction = ""] = String(value).split(".");
  return `${whole}.${fraction.padEnd(places, "0").slice(0, places)}`;
}

const scale: Partial<Record<keyof Settings, number>> = {
  defaultCommissionPct: 2,
  marketFeePct: 2,
  labourPerBag: 2,
  maundKg: 3,
};

type Reply = (
  config: InternalAxiosRequestConfig,
) => AxiosResponse | Promise<AxiosResponse>;

export interface SeenRequest {
  method: string;
  url: string;
  /** Parsed JSON body, or the FormData sent. */
  data: unknown;
}

/**
 * A fake API for the Settings page: keeps the shop's settings, answers
 * `GET/PATCH /settings`, `POST /settings/logo` and `GET /auth/me` like the
 * server, and records every request. Set `onGet`/`onPatch`/`onLogo` to answer
 * differently (errors, delays).
 */
export function settingsServer(initial: Settings = shopSettings()) {
  const server = {
    settings: initial,
    requests: [] as SeenRequest[],
    onGet: undefined as Reply | undefined,
    onPatch: undefined as Reply | undefined,
    onLogo: undefined as Reply | undefined,
    /** Requests to `method url`. */
    seen(method: string, url: string) {
      return server.requests.filter(
        (r) => r.method === method && r.url === url,
      );
    },
    adapter: (async (config) => {
      const method = (config.method ?? "get").toUpperCase();
      const url = config.url ?? "";
      const data =
        typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      server.requests.push({ method, url, data });

      if (method === "GET" && url === "/auth/me") {
        const { name, logoUrl } = server.settings;
        return ok(config, {
          ...owner,
          tenant: { ...owner.tenant, name, logoUrl },
        });
      }
      if (method === "GET" && url === "/settings") {
        return server.onGet
          ? server.onGet(config)
          : ok(config, server.settings);
      }
      if (method === "PATCH" && url === "/settings") {
        if (server.onPatch) return server.onPatch(config);
        const next = { ...server.settings, ...data } as Settings;
        for (const [field, places] of Object.entries(scale)) {
          const key = field as keyof Settings;
          if (key in data)
            Object.assign(next, { [key]: fixed(next[key], places) });
        }
        server.settings = { ...next, updatedAt: new Date().toISOString() };
        return ok(config, server.settings);
      }
      if (method === "POST" && url === "/settings/logo") {
        if (server.onLogo) return server.onLogo(config);
        server.settings = { ...server.settings, logoUrl: LOGO_URL };
        return ok(config, server.settings, 201);
      }
      throw httpError(config, 404, { message: `No route ${method} ${url}` });
    }) as AxiosAdapter,
  };
  return server;
}

/** A file of `size` bytes without allocating it. */
export function fakeFile(name: string, type: string, size = 20_000): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}
