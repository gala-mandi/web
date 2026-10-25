import type { Role } from "@/features/auth/types";

/**
 * What each shop role may see. Only for showing/hiding UI: the server checks
 * every request again (`RolesGuard`).
 */
export const permissions = [
  "dashboard:view",
  "rates:view",
  "purchases:view",
  "sales:view",
  "traders:view",
  "khata:view",
  "payments:view",
  "reports:view",
  "staff:manage",
  "settings:manage",
] as const;

export type Permission = (typeof permissions)[number];

const operator: Permission[] = [
  "dashboard:view",
  "rates:view",
  "purchases:view",
  "sales:view",
  "payments:view",
];

const manager: Permission[] = permissions.filter(
  (p) => p !== "staff:manage" && p !== "settings:manage",
);

const byRole: Record<Role, readonly Permission[]> = {
  owner: permissions,
  manager,
  operator,
  // The platform admin never uses the shop panel.
  super_admin: [],
};

export function can(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return byRole[role].includes(permission);
}
