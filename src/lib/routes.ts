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

/** Pages of the Traders section. */
export const traderRoutes = {
  list: panelRoutes.traders,
  detail: (id: string) => `${panelRoutes.traders}/${encodeURIComponent(id)}`,
} as const;

/** Pages of the Purchases section. */
export const purchaseRoutes = {
  list: panelRoutes.purchases,
  new: `${panelRoutes.purchases}/new`,
  detail: (id: string) => `${panelRoutes.purchases}/${encodeURIComponent(id)}`,
  edit: (id: string) =>
    `${panelRoutes.purchases}/${encodeURIComponent(id)}/edit`,
  /** The view, opening the print dialog once it has loaded. */
  print: (id: string) =>
    `${panelRoutes.purchases}/${encodeURIComponent(id)}?print=1`,
} as const;

/** Pages of the Sales section. */
export const saleRoutes = {
  list: panelRoutes.sales,
  new: `${panelRoutes.sales}/new`,
  detail: (id: string) => `${panelRoutes.sales}/${encodeURIComponent(id)}`,
  edit: (id: string) => `${panelRoutes.sales}/${encodeURIComponent(id)}/edit`,
  /** The view, opening the print dialog once it has loaded. */
  print: (id: string) =>
    `${panelRoutes.sales}/${encodeURIComponent(id)}?print=1`,
} as const;

/** Pages of the Ledger section. */
export const ledgerRoutes = {
  /** The khata page; with a trader, that trader's statement. */
  khata: (traderId?: string) =>
    traderId
      ? `${panelRoutes.ledger}?trader=${encodeURIComponent(traderId)}`
      : panelRoutes.ledger,
  balances: `${panelRoutes.ledger}/balances`,
} as const;

/**
 * Pages of the Payments section. The section's own page is the cash book
 * (`?from=&to=`, default today); a voucher is a payment (paid to a kissan)
 * or a receipt (received from a beopari).
 */
export const paymentRoutes = {
  cashBook: panelRoutes.payments,
  /** The cash book of one day. */
  cashBookOf: (day: string) =>
    `${panelRoutes.payments}?from=${encodeURIComponent(day)}&to=${encodeURIComponent(day)}`,
  /** The cash book (and its cash vouchers) of `from`..`to`. */
  cashBookRange: (from: string, to: string) =>
    `${panelRoutes.payments}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  new: (direction: "paid" | "received") =>
    `${panelRoutes.payments}/new?direction=${direction}`,
  detail: (id: string) => `${panelRoutes.payments}/${encodeURIComponent(id)}`,
  /** The voucher, opening the print dialog once it has loaded. */
  print: (id: string) =>
    `${panelRoutes.payments}/${encodeURIComponent(id)}?print=1`,
} as const;

/** The reports below `/reports`, in the hub's order. */
export const reportSlugs = [
  "daily-summary",
  "purchases",
  "sales",
  "commission",
  "outstanding",
  "cash-book",
] as const;

export type ReportSlug = (typeof reportSlugs)[number];

/** Pages of the Reports section: the hub and one page per report. */
export const reportRoutes = {
  hub: panelRoutes.reports,
  report: (slug: ReportSlug) => `${panelRoutes.reports}/${slug}`,
} as const;

export const panelSections = Object.keys(panelRoutes) as PanelSection[];

/**
 * Server permission needed to see a section in the menu and open its page.
 * Traders needs `trader.manage`: operators may pick traders in a purchase
 * (`trader.view`) but don't get the Traders page. The dashboard needs
 * `dashboard.view` (every shop role); what it shows depends on `report.view`
 * (operators get the simpler one).
 */
export const sectionPermission = {
  dashboard: "dashboard.view",
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
 * The first menu page the user may open: `/dashboard` for every shop role.
 * Users without any section still get `/dashboard`, which then shows the 403
 * page.
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
