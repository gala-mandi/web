import {
  BarChart3,
  BookOpenText,
  HandCoins,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  ShoppingCart,
  Store,
  TrendingUp,
  UserCog,
  Users,
  Wheat,
} from "lucide-react";
import type { User } from "@/features/auth/types";
import type { Permission } from "@/lib/can";
import {
  landingSectionFor,
  type PanelSection,
  panelRoutes,
  sectionPermission,
  sectionsFor,
} from "@/lib/routes";
import { panelText } from "./text";

export interface MenuItem {
  key: PanelSection;
  label: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
}

const icons: Record<PanelSection, LucideIcon> = {
  dashboard: LayoutDashboard,
  rates: TrendingUp,
  purchases: ShoppingCart,
  sales: Store,
  traders: Users,
  commodities: Wheat,
  ledger: BookOpenText,
  payments: HandCoins,
  reports: BarChart3,
  staff: UserCog,
  settings: Settings,
};

export function menuItem(key: PanelSection): MenuItem {
  return {
    key,
    label: panelText.sections[key].label,
    href: panelRoutes[key],
    icon: icons[key],
    permission: sectionPermission[key],
  };
}

/** Every panel page in menu order (see `sectionPermission` for the gating). */
export const menuItems: readonly MenuItem[] = (
  Object.keys(panelRoutes) as PanelSection[]
).map(menuItem);

/**
 * The menu for this user: only items whose permission the server gave them.
 * Owner: all 11. Manager: no Staff, Settings. Operator: Daily rates,
 * Purchases, Sales, Payments.
 */
export function menuFor(
  user: Pick<User, "permissions"> | null | undefined,
): MenuItem[] {
  return sectionsFor(user).map(menuItem);
}

/** The menu item of the user's landing page (first item they may open). */
export function landingItemFor(
  user: Pick<User, "permissions"> | null | undefined,
): MenuItem {
  return menuItem(landingSectionFor(user));
}
