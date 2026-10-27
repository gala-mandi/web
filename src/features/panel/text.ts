import type { Role } from "@/features/auth/types";
import type { PanelSection } from "@/lib/routes";

/**
 * Every user-facing string of the panel shell and its placeholder pages. Kept
 * out of the components so an Urdu version can be added later.
 */

/** `<title>` of a panel page. */
export const pageTitle = (title: string) => `${title} — Galla Mandi`;

export const panelText = {
  appSubtitle: "Shop panel",
  menuLabel: "Main menu",
  homeLabel: (page: string) => `Galla Mandi — go to ${page}`,
  breadcrumbLabel: "Breadcrumb",
  toggleSidebar: "Toggle menu",
  skipToContent: "Skip to main content",
  shopFallback: "Your shop",
  userMenu: {
    label: "Account menu",
    logout: "Log out",
    logoutAll: "Log out of all devices",
    logoutAllFailed: "Couldn’t log out of all devices. Try again.",
  },
  roles: {
    super_admin: "Super admin",
    owner: "Owner",
    manager: "Manager",
    operator: "Operator",
  } satisfies Record<Role, string>,
  sections: {
    dashboard: {
      label: "Dashboard",
      description: "Today’s rates, purchases and sales at a glance.",
    },
    rates: {
      label: "Daily rates",
      description: "Today’s mandi rate for each commodity, per maund.",
    },
    purchases: {
      label: "Purchases",
      description: "Grain bought from kissans, with their parchi.",
    },
    sales: {
      label: "Sales",
      description: "Grain sold to beoparis, with their parchi.",
    },
    traders: {
      label: "Traders",
      description: "Kissans and beoparis your shop deals with.",
    },
    commodities: {
      label: "Commodities",
      description: "Grains and crops your shop trades, and their deductions.",
    },
    ledger: {
      label: "Ledger",
      description: "Each trader’s khata: what they owe and what you owe.",
    },
    payments: {
      label: "Payments",
      description: "Money paid to kissans and received from beoparis.",
    },
    reports: {
      label: "Reports",
      description: "Daily, monthly and trader reports.",
    },
    staff: {
      label: "Staff",
      description: "People who use this shop’s account, and their roles.",
    },
    settings: {
      label: "Settings",
      description: "Shop name, logo, bill (parchi) and deduction settings.",
    },
  } satisfies Record<PanelSection, { label: string; description: string }>,
  comingSoon: {
    title: "Nothing here yet",
    body: "This page is coming in a later ticket.",
  },
  palette: {
    open: "Search pages",
    shortcut: "Ctrl K",
    title: "Go to a page",
    description: "Type a page name, then press Enter to open it.",
    placeholder: "Type a page name…",
    empty: "No page matches.",
    pages: "Pages",
    traders: "Traders",
    tradersSoon: "Traders search comes with the Traders module",
  },
  dashboard: {
    welcome: (name: string) => `Welcome, ${name}`,
    body: "Your shop’s daily rates, purchases and sales will show here.",
    loading: "Loading…",
    error: "Couldn’t load your account. Check your internet and try again.",
    retry: "Try again",
  },
  loading: "Loading page…",
  notFound: {
    metaTitle: "Page not found",
    code: "404",
    title: "Page not found",
    body: "The page you opened doesn’t exist or has moved. Check the address or use the menu.",
  },
  forbidden: {
    code: "403",
    title: "You don’t have access",
    body: "Your role can’t open this page. Ask your shop owner if you need it.",
  },
  backTo: (page: string) => `Back to ${page}`,
  error: {
    title: "Something went wrong",
    body: "This page couldn’t load. Check your internet and try again.",
    retry: "Try again",
    reference: (digest: string) => `Reference: ${digest}`,
  },
} as const;
