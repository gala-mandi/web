import { expect, type Locator, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import ur from "../../messages/ur.json";
import { operator } from "../mock-api";
import {
  BEOPARI,
  KISSAN,
  type Lang,
  type ListState,
  payment,
  purchase,
  sale,
  traders,
  type User,
} from "./shop-server";

/**
 * Every screen of the shop panel's task list in ticket 42, brought into the
 * state its design record shows. Used by the screen gallery
 * (`e2e/screen-gallery.spec.ts`); the index is docs/design/screens/README.md.
 */

type Messages = typeof ur;
export const messages: Record<Lang, Messages> = {
  en: en as unknown as Messages,
  ur,
};

export interface Screen {
  /** Folder under docs/design/screens/. */
  module: string;
  /** File name stem, e.g. "traders-list". */
  id: string;
  title: string;
  route: string;
  user?: User;
  /**
   * The API paths of the screen's own list. When set, the gallery also
   * shows the empty, loading and error states (English, desktop + phone).
   */
  listPaths?: string[];
  /** Which of those states apply; default empty, loading and error. */
  states?: Exclude<ListState, "data">[];
  /** Steps after the page loads (open a sheet, fill a form…). */
  act?: (page: Page, m: Messages, lang: Lang) => Promise<void>;
  /** Full-page picture on desktop too (long forms and reports). */
  tall?: boolean;
  /** A dialog or sheet is open: the window only, on phones too. */
  overlay?: boolean;
}

/** "Weight, Item 1" in the interface language. */
export function itemField(m: Messages, field: string, n = 1) {
  return m.purchases.form.fieldOfItem
    .replace("{field}", field)
    .replace(
      "{item}",
      m.purchases.form.itemLabel.replace("{n, number}", String(n)),
    );
}

/** Opens a picker with the keyboard, types, and takes the first match. */
async function pick(page: Page, box: Locator, search: string, option: RegExp) {
  await box.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.type(search);
  // The list follows the search (debounced); wait until the match leads.
  await expect(
    page.getByRole("listbox").getByRole("option").first(),
  ).toContainText(option);
  await page.getByRole("listbox").getByRole("option").first().click();
  await expect(box).toContainText(option);
}

/** A purchase or sale typed in with the keyboard: two items, live totals. */
async function fillBill(
  page: Page,
  m: Messages,
  party: { label: string; search: string; option: RegExp },
) {
  await pick(
    page,
    page.getByRole("combobox", { name: party.label, exact: true }),
    party.search,
    party.option,
  );
  const f = m.purchases.form;
  const field = (name: string, n = 1) =>
    page.getByLabel(itemField(m, name, n), { exact: true });
  const commodity = (n: number) =>
    page.getByRole("combobox", { name: itemField(m, f.commodity, n) });
  await pick(page, commodity(1), "Gan", /Gandum/);
  await field(f.bags).fill("10");
  await field(f.weight).fill("25.25");
  await field(f.weight).press("Enter");
  // Enter on the rate keeps today's rate and adds the next item.
  await field(f.rate).press("Enter");
  await expect(commodity(2)).toBeFocused();
  await pick(page, commodity(2), "Cha", /Chana/);
  await field(f.bags, 2).fill("6");
  await field(f.weight, 2).fill("15");
  await field(f.rate, 2).fill("7200");
  await field(f.rate, 2).blur();
}

const firstRowMenu = async (page: Page) => {
  await page.getByRole("row").nth(1).getByRole("button").last().click();
};

const reportSlugs = [
  "daily-summary",
  "purchases",
  "sales",
  "commission",
  "outstanding",
  "cash-book",
] as const;

export const screens: Screen[] = [
  // ------------------------------------------------------------ layout
  {
    module: "layout",
    id: "shell-owner",
    title: "Panel layout (owner menu, shop logo/name in the header)",
    route: "/dashboard",
  },
  {
    module: "layout",
    id: "shell-operator-menu",
    title: "Panel layout, operator's menu (role-based)",
    route: "/purchases",
    user: operator,
  },
  {
    module: "layout",
    id: "search-ctrl-k",
    overlay: true,
    title: "Ctrl+K search (pages and traders)",
    route: "/dashboard",
    act: async (page, m) => {
      await page.keyboard.press("Control+k");
      await expect(
        page.getByRole("dialog", { name: m.panel.palette.title }),
      ).toBeVisible();
      // Pages and traders (the owner may open trader profiles).
      await page.keyboard.type(m === messages.ur ? "محمد" : "ra");
      await expect(
        page
          .getByRole("group", { name: m.panel.palette.traders })
          .getByRole("option")
          .first(),
      ).toBeVisible();
    },
  },
  {
    module: "layout",
    id: "forbidden-403",
    title: "No access (403): operator opens Staff",
    route: "/staff",
    user: operator,
  },
  {
    module: "layout",
    id: "not-found-404",
    title: "Page not found (404)",
    route: "/no-such-page",
  },

  // --------------------------------------------------------- dashboard
  {
    module: "dashboard",
    id: "dashboard-owner",
    title: "Dashboard — owner",
    route: "/dashboard",
    listPaths: ["/reports/", "/rates", "/rates/today"],
    tall: true,
  },
  {
    module: "dashboard",
    id: "dashboard-operator",
    title: "Dashboard — operator",
    route: "/dashboard",
    user: operator,
    listPaths: ["/rates", "/rates/today", "/purchases", "/sales"],
    tall: true,
  },

  // ------------------------------------------------------------- rates
  {
    module: "rates",
    id: "rates-grid",
    title: "Daily rates grid and trend chart",
    route: "/rates",
    listPaths: ["/rates", "/rates/today", "/commodities"],
    tall: true,
  },

  // ----------------------------------------------------------- traders
  {
    module: "traders",
    id: "traders-list",
    title: "Traders list",
    route: "/traders",
    listPaths: ["/traders"],
  },
  {
    module: "traders",
    id: "trader-add-sheet",
    overlay: true,
    title: "Add trader sheet",
    route: "/traders",
    act: async (page, m) => {
      await page
        .getByRole("button", { name: m.traders.list.addButton })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    module: "traders",
    id: "trader-edit-sheet",
    overlay: true,
    title: "Edit trader sheet",
    route: "/traders",
    act: async (page, m) => {
      await firstRowMenu(page);
      await page
        .getByRole("menuitem", { name: m.traders.actions.edit })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    module: "traders",
    id: "trader-profile",
    title: "Trader profile",
    route: `/traders/${KISSAN.id}`,
    listPaths: ["/traders/"],
    states: ["loading", "error"],
    tall: true,
  },

  // ------------------------------------------------------- commodities
  {
    module: "commodities",
    id: "commodities-list",
    title: "Commodities list",
    route: "/commodities",
    listPaths: ["/commodities"],
  },
  {
    module: "commodities",
    id: "commodity-add-sheet",
    overlay: true,
    title: "Add commodity form",
    route: "/commodities",
    act: async (page, m) => {
      await page
        .getByRole("button", { name: m.commodities.list.addButton })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    module: "commodities",
    id: "commodity-edit-sheet",
    overlay: true,
    title: "Edit commodity form",
    route: "/commodities",
    act: async (page) => {
      await firstRowMenu(page);
      await page.getByRole("menuitem").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },

  // --------------------------------------------------------- purchases
  {
    module: "purchases",
    id: "purchases-list",
    title: "Purchases list",
    route: "/purchases",
    listPaths: ["/purchases"],
  },
  {
    module: "purchases",
    id: "purchase-entry",
    title: "Purchase entry (keyboard-first, live totals)",
    route: "/purchases/new",
    tall: true,
    act: (page, m, lang) =>
      fillBill(page, m, {
        label: m.purchases.form.trader,
        search: lang === "ur" ? "محمد" : "Raf",
        option: /Rafiq Ahmad|محمد رفیق/,
      }),
  },
  {
    module: "purchases",
    id: "purchase-view",
    title: "Saved purchase with its parchi",
    route: `/purchases/${purchase.id}`,
    tall: true,
  },

  // ------------------------------------------------------------- sales
  {
    module: "sales",
    id: "sales-list",
    title: "Sales list",
    route: "/sales",
    listPaths: ["/sales"],
  },
  {
    module: "sales",
    id: "sale-entry",
    title: "Sale entry (keyboard-first, live totals)",
    route: "/sales/new",
    tall: true,
    act: (page, m) =>
      fillBill(page, m, {
        label: m.sales.form.buyer,
        search: "Sha",
        option: new RegExp(BEOPARI.name),
      }),
  },
  {
    module: "sales",
    id: "sale-view",
    title: "Saved sale with its parchi",
    route: `/sales/${sale.id}`,
    tall: true,
  },

  // ------------------------------------------------------------ ledger
  {
    module: "ledger",
    id: "khata-pick",
    title: "Khata — pick a trader",
    route: "/ledger",
  },
  {
    module: "ledger",
    id: "khata-statement",
    title: "Khata / ledger statement",
    route: `/ledger?trader=${KISSAN.id}`,
    listPaths: ["/ledger/"],
    tall: true,
  },
  {
    module: "ledger",
    id: "balances",
    title: "Balances page",
    route: "/ledger/balances",
    listPaths: ["/ledger/balances"],
  },

  // ---------------------------------------------------------- payments
  {
    module: "payments",
    id: "cash-book",
    title: "Payments and today's cash book",
    route: "/payments",
    listPaths: ["/payments", "/payments/cash-book"],
    tall: true,
  },
  {
    module: "payments",
    id: "payment-entry-allocations",
    title: "Payment entry with bill allocations",
    route: "/payments/new?direction=paid",
    tall: true,
    act: async (page, m, lang) => {
      await pick(
        page,
        page.getByRole("combobox", {
          name: m.payments.form.trader.paid,
          exact: true,
        }),
        lang === "ur" ? "محمد" : "Raf",
        /Rafiq Ahmad|محمد رفیق/,
      );
      await page.getByLabel(m.payments.form.amount).fill("100000");
      await page.getByLabel(m.payments.form.amount).blur();
    },
  },
  {
    module: "payments",
    id: "payment-voucher",
    title: "Saved payment voucher",
    route: `/payments/${payment.id}`,
    tall: true,
  },

  // ----------------------------------------------------------- reports
  {
    module: "reports",
    id: "reports-hub",
    title: "Reports hub",
    route: "/reports",
  },
  ...reportSlugs.map((slug): Screen => ({
    module: "reports",
    id: `report-${slug}`,
    title: `Report — ${en.reports.reports[slug].title}`,
    route: `/reports/${slug}`,
    listPaths: ["/reports/"],
    tall: true,
  })),

  // ------------------------------------------------------------- staff
  {
    module: "staff",
    id: "staff-list",
    title: "Staff management",
    route: "/staff",
    listPaths: ["/staff"],
  },
  {
    module: "staff",
    id: "staff-invitations",
    title: "Pending invitations",
    route: "/staff",
    listPaths: ["/staff/invitations"],
    act: async (page, m) => {
      await page.getByRole("tab", { name: m.staff.tabs.invitations }).click();
    },
  },
  {
    module: "staff",
    id: "staff-invite",
    overlay: true,
    title: "Invite staff",
    route: "/staff",
    act: async (page, m) => {
      await page
        .getByRole("button", { name: m.staff.inviteButton })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },

  // ---------------------------------------------------------- settings
  {
    module: "settings",
    id: "shop-settings",
    title: "Shop settings",
    route: "/settings",
    listPaths: ["/settings"],
    states: ["loading", "error"],
    tall: true,
  },
];

/** Parchi print layouts (print media): paper × language. */
export const parchiPrints = [
  { id: "parchi-a4-en", paper: "a4", lang: "en", width: 794 },
  { id: "parchi-a5-en", paper: "a5", lang: "en", width: 559 },
  { id: "parchi-80mm-en", paper: "thermal80", lang: "en", width: 302 },
  { id: "parchi-a4-ur", paper: "a4", lang: "ur", width: 794 },
  { id: "parchi-a5-ur", paper: "a5", lang: "ur", width: 559 },
  { id: "parchi-80mm-ur", paper: "thermal80", lang: "ur", width: 302 },
] as const;

export { traders };
