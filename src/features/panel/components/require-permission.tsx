"use client";

import type { ReactNode } from "react";
import { type Permission, useCan } from "@/lib/can";
import { ForbiddenState } from "./status-pages";

/**
 * Renders the page only when the server gave the user `permission`, otherwise
 * the 403 state inside the layout. UI only: the server checks every request.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  return useCan(permission) ? children : <ForbiddenState />;
}
