import type { User } from "@/features/auth/types";
import {
  type PanelSection,
  panelRoutes,
  type ReportSlug,
  reportSlugs,
  sectionOf,
} from "@/lib/routes";
import { landingItemFor, menuItem } from "./menu";
import { panelText } from "./text";

export interface Crumb {
  label: string;
  /** null for the current page. */
  href: string | null;
}

/**
 * Breadcrumbs from the URL: the user's landing page › section. Unknown URLs
 * end in "Page not found". A page below a section (`/traders/:id`) adds its
 * own last crumb after a link to the section; deeper levels are added by the
 * tickets that build them.
 */
export function breadcrumbsFor(
  pathname: string,
  user: Pick<User, "permissions"> | null | undefined,
): Crumb[] {
  const home = landingItemFor(user);
  const section = sectionOf(pathname);
  if (section === home.key && pathname === home.href) {
    return [{ label: home.label, href: null }];
  }
  const detail = section ? detailCrumb(section, pathname) : null;
  if (section && detail) {
    const item = menuItem(section);
    const crumbs: Crumb[] = [
      { label: item.label, href: item.href },
      { label: detail, href: null },
    ];
    return section === home.key
      ? crumbs
      : [{ label: home.label, href: home.href }, ...crumbs];
  }
  const current = section ? menuItem(section).label : panelText.notFound.title;
  return [
    { label: home.label, href: home.href },
    { label: current, href: null },
  ];
}

/** `new`, `:id` and `:id/edit` below a bill section (purchases, sales). */
function billCrumbs(newBill: string, bill: string, editBill: string) {
  return ([id, page, ...rest]: string[]): string | null => {
    if (rest.length > 0) return null;
    if (page === undefined) return id === "new" ? newBill : bill;
    return page === "edit" && id !== "new" ? editBill : null;
  };
}

/**
 * Pages below a section, by section: the crumb for the rest of the path
 * (`["abc"]` for `/traders/abc`), or null when the section has no such page.
 */
const detailCrumbs: Partial<
  Record<PanelSection, (parts: string[]) => string | null>
> = {
  traders: (parts) =>
    parts.length === 1 ? panelText.crumbs.traderProfile : null,
  purchases: billCrumbs(
    panelText.crumbs.newPurchase,
    panelText.crumbs.purchase,
    panelText.crumbs.editPurchase,
  ),
  ledger: (parts) =>
    parts.length === 1 && parts[0] === "balances"
      ? panelText.crumbs.balances
      : null,
  sales: billCrumbs(
    panelText.crumbs.newSale,
    panelText.crumbs.sale,
    panelText.crumbs.editSale,
  ),
  reports: (parts) =>
    parts.length === 1 && (reportSlugs as readonly string[]).includes(parts[0])
      ? panelText.crumbs.reports[parts[0] as ReportSlug]
      : null,
  // Vouchers are never edited (cancel instead): `new` and `:id` only.
  payments: (parts) =>
    parts.length === 1
      ? parts[0] === "new"
        ? panelText.crumbs.newVoucher
        : panelText.crumbs.voucher
      : null,
};

/** `/traders/abc` → "Trader profile"; null for the section page itself. */
function detailCrumb(section: PanelSection, pathname: string): string | null {
  const rest = pathname.slice(panelRoutes[section].length).replace(/\/$/, "");
  if (!/^(\/[^/]+)+$/.test(rest)) return null;
  return detailCrumbs[section]?.(rest.slice(1).split("/")) ?? null;
}
