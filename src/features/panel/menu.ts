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
import type { Translator } from "@/i18n/types";

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

/** Menu labels come from the `panel` messages of the interface language. */
export type PanelTranslator = Translator<"panel">;

export function menuItem(key: PanelSection, t: PanelTranslator): MenuItem {
  return {
    key,
    label: t(`sections.${key}.label`),
    href: panelRoutes[key],
    icon: icons[key],
    permission: sectionPermission[key],
  };
}

/**
 * The menu for this user: only items whose permission the server gave them.
 * Owner: all 11. Manager: no Staff, Settings. Operator: Dashboard, Daily
 * rates, Purchases, Sales, Payments.
 */
export function menuFor(
  user: Pick<User, "permissions"> | null | undefined,
  t: PanelTranslator,
): MenuItem[] {
  return sectionsFor(user).map((key) => menuItem(key, t));
}

/** The menu item of the user's landing page (first item they may open). */
export function landingItemFor(
  user: Pick<User, "permissions"> | null | undefined,
  t: PanelTranslator,
): MenuItem {
  return menuItem(landingSectionFor(user), t);
}
