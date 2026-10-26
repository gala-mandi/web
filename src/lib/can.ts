import type { User } from "@/features/auth/types";
import { useSessionStore } from "@/stores/session";

/**
 * Every permission the server knows, copied name for name from the server's
 * `src/common/auth/permissions.ts`. The server decides which of these a user
 * has and sends them as `user.permissions`; the browser keeps no role matrix.
 * Only for showing/hiding UI: the server checks every request again.
 */
export const PERMISSIONS = [
  // Platform (super_admin only)
  "tenant.manage",
  "plan.manage",
  "platform_report.view",
  // Shop
  "dashboard.view",
  "staff.manage",
  "settings.manage",
  "trader.view",
  "trader.manage",
  "trader.delete",
  "commodity.view",
  "commodity.manage",
  "commodity.delete",
  "rate.view",
  "rate.manage",
  "purchase.view",
  "purchase.create",
  "purchase.edit",
  "purchase.delete",
  "sale.view",
  "sale.create",
  "sale.edit",
  "sale.delete",
  "payment.view",
  "payment.create",
  "payment.edit",
  "payment.delete",
  "ledger.view",
  "report.view",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

type WithPermissions = Pick<User, "permissions"> | null | undefined;

/** Pure check for tests and non-React code. No user / no permissions → false. */
export function hasPermission(
  user: WithPermissions,
  permission: Permission,
): boolean {
  const granted: readonly string[] | undefined = user?.permissions;
  return Array.isArray(granted) && granted.includes(permission);
}

/** Checks the signed-in user (session store). Not reactive: use `useCan` in components. */
export function can(permission: Permission): boolean {
  return hasPermission(useSessionStore.getState().user, permission);
}

/** Re-renders when the signed-in user's permissions change. */
export function useCan(permission: Permission): boolean {
  return useSessionStore((s) => hasPermission(s.user, permission));
}
