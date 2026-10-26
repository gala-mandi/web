import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import type { Session, User } from "@/features/auth/types";
import { rolePermissions } from "./permissions";

export const owner: User = {
  id: "u1",
  name: "Haji Aslam",
  phone: "03000000002",
  email: null,
  role: "owner",
  permissions: [...rolePermissions.owner],
  tenantId: "t1",
  mustChangePassword: false,
  tenant: { id: "t1", name: "Demo Mandi", logoUrl: null, status: "active" },
};

export function sessionFor(user: User, accessToken = "token-1"): Session {
  return { accessToken, expiresIn: 900, user };
}

export function ok<T>(
  config: InternalAxiosRequestConfig,
  data: T,
  status = 200,
): AxiosResponse<T> {
  return { data, status, statusText: "OK", headers: {}, config };
}

/** What a real adapter throws for a non-2xx response. */
export function httpError(
  config: InternalAxiosRequestConfig | undefined,
  status: number,
  data: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): AxiosError {
  const cfg =
    config ?? ({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig);
  const response: AxiosResponse = {
    data: { statusCode: status, message: "error", ...data },
    status,
    statusText: String(status),
    headers,
    config: cfg,
  };
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    cfg,
    null,
    response,
  );
}

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

/** Adapter that answers with `handler`; records the URL + token of every call. */
export function fakeAdapter(handler: Handler) {
  const calls: { url: string | undefined; token: string | null }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const auth = config.headers?.Authorization;
    calls.push({
      url: config.url,
      token: typeof auth === "string" ? auth.replace("Bearer ", "") : null,
    });
    return handler(config);
  };
  return { adapter, calls };
}
