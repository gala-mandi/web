import type { User } from "@/features/auth/types";
import { hasPermission, type Permission } from "@/lib/can";

export interface MenuItem {
  key: string;
  label: string;
  permission: Permission;
  /** null until the page exists (added by the layout ticket). */
  href: string | null;
}

/**
 * The shop panel menu; each item is shown only to users the server gave its
 * permission. Traders needs `trader.manage`: operators may pick traders in a
 * purchase (`trader.view`) but don't get the Traders page.
 */
export const menuItems: readonly MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    permission: "dashboard.view",
    href: "/dashboard",
  },
  { key: "rates", label: "Daily rates", permission: "rate.view", href: null },
  {
    key: "purchases",
    label: "Purchases",
    permission: "purchase.view",
    href: null,
  },
  { key: "sales", label: "Sales", permission: "sale.view", href: null },
  { key: "traders", label: "Traders", permission: "trader.manage", href: null },
  { key: "khata", label: "Khata", permission: "ledger.view", href: null },
  {
    key: "payments",
    label: "Payments",
    permission: "payment.view",
    href: null,
  },
  { key: "reports", label: "Reports", permission: "report.view", href: null },
  { key: "staff", label: "Staff", permission: "staff.manage", href: null },
  {
    key: "settings",
    label: "Settings",
    permission: "settings.manage",
    href: null,
  },
];

export function menuFor(
  user: Pick<User, "permissions"> | null | undefined,
): MenuItem[] {
  return menuItems.filter((item) => hasPermission(user, item.permission));
}
