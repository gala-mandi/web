import type { User } from "@/features/auth/types";
import { hasPermission, type Permission } from "@/lib/can";

/** Pages that never need a session (used by `proxy.ts` and the client). */
export const publicPaths = [
  "/",
  "/login",
  "/forgot-password",
  "/accept-invite",
  "/account-disabled",
  "/shop-suspended",
] as const;

export function isPublicPath(pathname: string): boolean {
  return (publicPaths as readonly string[]).includes(pathname);
}

/**
 * Pages of the logged-in panel (`src/app/(panel)/`), in menu order. Not in
 * `publicPaths`, so `proxy.ts` protects them; `AuthGuard` checks the session.
 */
export const panelRoutes = {
  dashboard: "/dashboard",
  rates: "/rates",
  purchases: "/purchases",
  sales: "/sales",
  traders: "/traders",
  commodities: "/commodities",
  ledger: "/ledger",
  payments: "/payments",
  reports: "/reports",
  staff: "/staff",
  settings: "/settings",
} as const;

export type PanelSection = keyof typeof panelRoutes;

export const panelSections = Object.keys(panelRoutes) as PanelSection[];

/**
 * Server permission needed to see a section in the menu and open its page.
 * Traders needs `trader.manage`: operators may pick traders in a purchase
 * (`trader.view`) but don't get the Traders page. The dashboard shows shop
 * figures, so it needs `report.view`.
 */
export const sectionPermission = {
  dashboard: "report.view",
  rates: "rate.view",
  purchases: "purchase.view",
  sales: "sale.view",
  traders: "trader.manage",
  commodities: "commodity.manage",
  ledger: "ledger.view",
  payments: "payment.view",
  reports: "report.view",
  staff: "staff.manage",
  settings: "settings.manage",
} as const satisfies Record<PanelSection, Permission>;

/**
 * Sends a signed-in user to their landing page (`src/app/home`). Used where
 * the user's permissions are not known yet, e.g. by `proxy.ts`.
 */
export const HOME_PATH = "/home";

type WithPermissions = Pick<User, "permissions"> | null | undefined;

/** True for a menu page and anything below it (`/sales/42`). */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The panel section a path belongs to, or null (`/change-password`, `/foo`). */
export function sectionOf(path: string): PanelSection | null {
  const pathname = path.split(/[?#]/)[0];
  return (
    panelSections.find((s) => isActivePath(pathname, panelRoutes[s])) ?? null
  );
}

/** Sections the user may open, in menu order. */
export function sectionsFor(user: WithPermissions): PanelSection[] {
  return panelSections.filter((s) => hasPermission(user, sectionPermission[s]));
}

/**
 * The first menu page the user may open: `/dashboard` for owners and
 * managers, `/rates` for operators (who have no dashboard). Users without any
 * section still get `/dashboard`, which then shows the 403 page.
 */
export function landingSectionFor(user: WithPermissions): PanelSection {
  return sectionsFor(user)[0] ?? "dashboard";
}

export function landingPathFor(user: WithPermissions): string {
  return panelRoutes[landingSectionFor(user)];
}

/** False only for a panel page whose permission the user lacks. */
export function canOpenPath(user: WithPermissions, path: string): boolean {
  const section = sectionOf(path);
  return section === null || hasPermission(user, sectionPermission[section]);
}
