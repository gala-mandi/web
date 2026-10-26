import type { Permission } from "../lib/can";

/**
 * What the server sends as `user.permissions` for each role (mirror of the
 * server's default matrix in `src/common/auth/permissions.ts`). Test data only:
 * the app itself never derives permissions from the role.
 */
const owner: Permission[] = [
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
];

const manager: Permission[] = owner.filter(
  (p) =>
    p !== "staff.manage" &&
    p !== "settings.manage" &&
    p !== "audit.view" &&
    !p.endsWith(".delete"),
);

const operator: Permission[] = [
  "dashboard.view",
  "rate.view",
  "trader.view",
  "commodity.view",
  "purchase.view",
  "purchase.create",
  "sale.view",
  "sale.create",
  "payment.view",
  "payment.create",
];

const superAdmin: Permission[] = [
  "tenant.manage",
  "plan.manage",
  "platform_report.view",
];

export const rolePermissions = {
  owner,
  manager,
  operator,
  super_admin: superAdmin,
} as const;
