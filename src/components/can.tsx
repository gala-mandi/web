"use client";

import type { ReactNode } from "react";
import { type Permission, useCan } from "@/lib/can";

/**
 * Renders `children` only when the signed-in user has `permission`, otherwise
 * `fallback` (nothing by default). Hides buttons only: the server still
 * checks every request.
 *
 * @example <Can permission="purchase.delete"><Button>Delete</Button></Can>
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(permission) ? children : fallback;
}
