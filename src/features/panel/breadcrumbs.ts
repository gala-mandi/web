import type { User } from "@/features/auth/types";
import { sectionOf } from "@/lib/routes";
import { landingItemFor, menuItem } from "./menu";
import { panelText } from "./text";

export interface Crumb {
  label: string;
  /** null for the current page. */
  href: string | null;
}

/**
 * Breadcrumbs from the URL: the user's landing page › section. Unknown URLs
 * end in "Page not found". Deeper levels are added by the tickets that build
 * them.
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
  const current = section ? menuItem(section).label : panelText.notFound.title;
  return [
    { label: home.label, href: home.href },
    { label: current, href: null },
  ];
}
