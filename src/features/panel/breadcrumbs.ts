import type { User } from "@/features/auth/types";
import { type PanelSection, panelRoutes, sectionOf } from "@/lib/routes";
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

/** Pages one level below a section, by section. */
const detailCrumbs: Partial<Record<PanelSection, string>> = {
  traders: panelText.crumbs.traderProfile,
};

/** `/traders/abc` → "Trader profile"; null for the section page itself. */
function detailCrumb(section: PanelSection, pathname: string): string | null {
  const rest = pathname.slice(panelRoutes[section].length).replace(/\/$/, "");
  if (!/^\/[^/]+$/.test(rest)) return null;
  return detailCrumbs[section] ?? null;
}
