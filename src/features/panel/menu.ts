import type { Role } from "@/features/auth/types";
import { can, type Permission } from "@/lib/can";

export interface MenuItem {
  key: string;
  label: string;
  permission: Permission;
  /** null until the page exists (added by the layout ticket). */
  href: string | null;
}

/** The shop panel menu; each item is shown only to roles with its permission. */
export const menuItems: readonly MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    permission: "dashboard:view",
    href: "/dashboard",
  },
  { key: "rates", label: "Daily rates", permission: "rates:view", href: null },
  {
    key: "purchases",
    label: "Purchases",
    permission: "purchases:view",
    href: null,
  },
  { key: "sales", label: "Sales", permission: "sales:view", href: null },
  { key: "traders", label: "Traders", permission: "traders:view", href: null },
  { key: "khata", label: "Khata", permission: "khata:view", href: null },
  {
    key: "payments",
    label: "Payments",
    permission: "payments:view",
    href: null,
  },
  { key: "reports", label: "Reports", permission: "reports:view", href: null },
  { key: "staff", label: "Staff", permission: "staff:manage", href: null },
  {
    key: "settings",
    label: "Settings",
    permission: "settings:manage",
    href: null,
  },
];

export function menuFor(role: Role | null | undefined): MenuItem[] {
  return menuItems.filter((item) => can(role, item.permission));
}
