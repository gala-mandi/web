import type { BrowserContext, Page, Route } from "@playwright/test";
import {
  commodity,
  lookupItem,
} from "../../src/features/commodities/test-data";
import {
  commodityIds,
  commodityList,
  dailySummary,
  emptyShop,
  outstanding,
  purchasesByCommodity,
  purchasesByDay,
  rateHistories,
  salesByDay,
} from "../../src/features/dashboard/test-data";
import {
  balances,
  statement,
  traderBalance,
} from "../../src/features/ledger/test-data";
import {
  purchaseRow,
  savedPayment,
  todayCashBook,
} from "../../src/features/payments/test-data";
import {
  chanaItem,
  gandumItem,
  KISSAN,
  savedPurchase,
  ticketInput,
} from "../../src/features/purchases/test-data";
import {
  emptyBook,
  emptyCashBook,
  emptyCommission,
  fullOutstanding,
  monthCashBook,
  monthCommission,
  monthPurchases,
  monthPurchasesByCommodity,
  monthPurchasesByTrader,
  monthSales,
} from "../../src/features/reports/test-data";
import {
  BEOPARI,
  beopariDetail,
  savedSale,
  ticketSale,
} from "../../src/features/sales/test-data";
import {
  bilalOperator,
  invitation,
  nadeemManager,
  youOwner,
} from "../../src/features/staff/test-data";
import { shopStates } from "../../src/features/subscription/test-data";
import { traderDetail } from "../../src/features/traders/test-data";
import {
  API,
  owner,
  session,
  setRefreshCookie,
  shopSettings,
} from "../mock-api";

/**
 * One fake server for every screen of the shop panel (ticket 42 screen
 * gallery and form checks): a busy mandi shop in Okara on Friday 6 Nov 2026.
 * Every API call is answered here (`page.route`), so no server is needed.
 *
 * `state` changes the answers of the screen's own list (`listPaths`) only:
 * "empty" returns no rows, "loading" never answers, "error" answers 500.
 * Everything else (session, settings, menus) keeps answering normally.
 */

export const NOW = new Date("2026-11-06T07:00:00.000Z");

export type ListState = "data" | "empty" | "loading" | "error";
export type Lang = "en" | "ur";
export type User = typeof owner;

const list = <T>(data: T[], limit = 20) => ({
  data,
  meta: { page: 1, limit, total: data.length },
});

// ---------------------------------------------------------------- traders

const traders = [
  traderDetail({
    id: KISSAN.id,
    name: KISSAN.name,
    fatherName: "Ghulam Nabi",
    phone: KISSAN.phone,
    village: KISSAN.village,
    balance: "-20500.00",
    openingBalance: "10000.00",
  }),
  beopariDetail(),
  traderDetail({
    id: "a1111111-1111-4111-8111-111111111111",
    name: "محمد اسلم",
    fatherName: "محمد اکرم",
    phone: "03214567890",
    village: "چک 45",
    balance: "-86500.00",
  }),
  traderDetail({
    id: "a2222222-2222-4222-8222-222222222222",
    type: "beopari",
    name: "Malik Traders",
    fatherName: null,
    cnic: null,
    village: "Okara",
    phone: "03008889990",
    creditLimit: "1500000.00",
    balance: "1245000.00",
    openingBalance: "0.00",
  }),
  traderDetail({
    id: "a3333333-3333-4333-8333-333333333333",
    name: "Haji Bashir Ahmad",
    fatherName: "Allah Rakha",
    village: "Renala Khurd",
    phone: "03125550101",
    balance: "-865000.00",
  }),
  traderDetail({
    id: "a4444444-4444-4444-8444-444444444444",
    type: "beopari",
    name: "Chaudhry Flour Mills",
    fatherName: null,
    cnic: null,
    village: "Sahiwal",
    phone: "04235711000",
    creditLimit: "1000000.00",
    balance: "986500.50",
    openingBalance: "250000.00",
  }),
  traderDetail({
    id: "a5555555-5555-4555-8555-555555555555",
    name: "Allah Ditta",
    fatherName: "Muhammad Din",
    village: "Chak 32/2L",
    phone: null,
    cnic: null,
    balance: "0.00",
    openingBalance: "0.00",
  }),
  traderDetail({
    id: "a6666666-6666-4666-8666-666666666666",
    type: "beopari",
    name: "Sheikh Brothers",
    fatherName: null,
    village: "Depalpur",
    phone: "03017778889",
    balance: "468750.25",
    isActive: false,
  }),
];

const lookupTraders = traders.map(
  ({ id, type, name, fatherName, phone, village }) => ({
    id,
    type,
    name,
    fatherName,
    phone,
    village,
  }),
);

// ------------------------------------------------------------ commodities

const commodities = [
  ...commodityList.map((c) => commodity({ ...c, defaultUnit: "maund" })),
  commodity({
    id: "c5555555-5555-4555-8555-555555555555",
    name: "Chana",
    nameUr: "چنا",
    category: "pulse",
    defaultUnit: "maund",
    bagWeightKg: null,
    commissionPct: "3.00",
  }),
  commodity({
    id: "c6666666-6666-4666-8666-666666666666",
    name: "Sarson",
    nameUr: "سرسوں",
    category: "oilseed",
    defaultUnit: "kg",
    bagWeightKg: "50.000",
    isActive: false,
  }),
];

// ------------------------------------------------------------- the books

const purchase = savedPurchase(ticketInput, {
  trader: { id: KISSAN.id, name: KISSAN.name },
  billNo: "PUR-2026-27-000214",
});
const urduPurchase = savedPurchase(ticketInput, {
  trader: { id: KISSAN.id, name: "محمد رفیق" },
  billNo: "PUR-2026-27-000214",
});

const purchaseRows = [
  {
    ...purchaseRow(6, {
      billNo: "PUR-2026-27-000214",
      purchaseDate: "2026-11-06",
      netAmount: purchase.netAmount,
      grossAmount: purchase.grossAmount,
      totalDeductions: purchase.totalDeductions,
      outstanding: purchase.netAmount,
    }),
    id: purchase.id,
  },
  purchaseRow(5, {
    billNo: "PUR-2026-27-000213",
    purchaseDate: "2026-11-06",
    trader: { id: traders[2].id, name: traders[2].name },
    netAmount: "412350.00",
    grossAmount: "421000.00",
    totalDeductions: "8650.00",
    paidAmount: "100000.00",
    outstanding: "312350.00",
  }),
  purchaseRow(4, {
    billNo: "PUR-2026-27-000212",
    purchaseDate: "2026-11-05",
    trader: { id: traders[4].id, name: traders[4].name },
    netAmount: "865000.00",
    grossAmount: "884600.00",
    totalDeductions: "19600.00",
    outstanding: "865000.00",
  }),
  purchaseRow(3, {
    billNo: "PUR-2026-27-000211",
    purchaseDate: "2026-11-05",
    outstanding: "0.00",
    paidAmount: "100000.00",
  }),
  purchaseRow(2, {
    billNo: "PUR-2026-27-000210",
    purchaseDate: "2026-11-04",
    trader: { id: traders[6].id, name: traders[6].name },
    status: "cancelled",
    outstanding: "0.00",
  }),
  purchaseRow(1, {
    billNo: "PUR-2026-27-000209",
    purchaseDate: "2026-11-03",
    netAmount: "60000.00",
    outstanding: "30000.00",
  }),
];

const sale = savedSale(ticketSale, { billNo: "SAL-2026-27-000118" });
const saleSummary = (n: number, overrides: Record<string, unknown> = {}) => ({
  ...sale,
  items: undefined,
  charges: undefined,
  warnings: undefined,
  id: `aaaaaaaa-5555-4555-8555-55555555555${n}`,
  ...overrides,
});
const saleRows = [
  { ...saleSummary(5), id: sale.id },
  saleSummary(4, {
    billNo: "SAL-2026-27-000117",
    buyer: { id: traders[3].id, name: "Malik Traders" },
    netAmount: "1245000.00",
    grossAmount: "1218000.00",
    totalCharges: "27000.00",
    outstanding: "1245000.00",
  }),
  saleSummary(3, {
    billNo: "SAL-2026-27-000116",
    saleDate: "2026-11-05",
    buyer: { id: traders[5].id, name: "Chaudhry Flour Mills" },
    netAmount: "736500.00",
    receivedAmount: "250000.00",
    outstanding: "486500.00",
  }),
  saleSummary(2, {
    billNo: "SAL-2026-27-000115",
    saleDate: "2026-11-05",
    status: "cancelled",
    outstanding: "0.00",
  }),
  saleSummary(1, {
    billNo: "SAL-2026-27-000114",
    saleDate: "2026-11-04",
    outstanding: "0.00",
    receivedAmount: sale.netAmount,
  }),
];

const payment = savedPayment({ voucherNo: "PAY-2026-27-000087" });
const payments = [
  payment,
  savedPayment({
    id: "dddddddd-8888-4888-8888-888888888882",
    voucherNo: "RCT-2026-27-000052",
    direction: "received",
    trader: { id: traders[3].id, name: "Malik Traders" },
    amount: "250000.00",
    allocated: "250000.00",
    method: "bank",
    reference: "HBL 0045-77812",
  }),
  savedPayment({
    id: "dddddddd-8888-4888-8888-888888888883",
    voucherNo: "PAY-2026-27-000086",
    trader: { id: traders[4].id, name: "Haji Bashir Ahmad" },
    paymentDate: "2026-11-05",
    amount: "50000.00",
    allocated: "0.00",
    advance: "50000.00",
    method: "cash",
  }),
  savedPayment({
    id: "dddddddd-8888-4888-8888-888888888884",
    voucherNo: "RCT-2026-27-000051",
    direction: "received",
    trader: { id: traders[5].id, name: "Chaudhry Flour Mills" },
    paymentDate: "2026-11-05",
    amount: "80000.00",
    allocated: "80000.00",
    method: "cheque",
    reference: "Cheque 448190",
    status: "cancelled",
  }),
].map((p) => ({ ...p, allocations: undefined }));

// ------------------------------------------------------------------ rates

const todaysRates = Object.values(rateHistories).map((rates) => rates.at(-1)!);
const yesterdaysRates = Object.values(rateHistories).map((rates) =>
  rates.at(-2)!,
);

// ------------------------------------------------------------------ staff

const staff = [
  youOwner,
  nadeemManager,
  bilalOperator,
  {
    ...bilalOperator,
    id: "u4",
    name: "Kashif Ali",
    phone: "03451239876",
    lastLoginAt: "2026-11-06T04:10:00.000Z",
    mustChangePassword: false,
  },
];
const invitations = [
  invitation({
    createdAt: "2026-11-06T05:00:00.000Z",
    expiresAt: "2026-11-08T05:00:00.000Z",
  }),
  invitation({
    id: "i2",
    phone: "03331234567",
    role: "manager",
    createdAt: "2026-11-05T05:00:00.000Z",
    expiresAt: "2026-11-07T05:00:00.000Z",
  }),
];

// ---------------------------------------------------------------- ledger

const balanceRows = [
  traderBalance({
    traderId: traders[3].id,
    type: "beopari",
    name: "Malik Traders",
    phone: "03008889990",
    balance: "1245000.00",
    receivable: "1245000.00",
    payable: "0.00",
  }),
  traderBalance({
    traderId: traders[5].id,
    type: "beopari",
    name: "Chaudhry Flour Mills",
    phone: "04235711000",
    balance: "986500.50",
    receivable: "986500.50",
    payable: "0.00",
  }),
  traderBalance({
    traderId: traders[4].id,
    name: "Haji Bashir Ahmad",
    phone: "03125550101",
    balance: "-865000.00",
    receivable: "0.00",
    payable: "865000.00",
  }),
  traderBalance({
    traderId: traders[2].id,
    name: "محمد اسلم",
    phone: "03214567890",
    balance: "-86500.00",
    receivable: "0.00",
    payable: "86500.00",
  }),
  traderBalance({
    traderId: BEOPARI.id,
    type: "beopari",
    name: BEOPARI.name,
    phone: BEOPARI.phone,
    balance: "20000.00",
    receivable: "20000.00",
    payable: "0.00",
  }),
  traderBalance(),
];

// ---------------------------------------------------------------- server

/** What the gallery or a check wants from the fake server. */
export interface ShopServerOptions {
  user?: User;
  lang?: Lang;
  /** The state of the screen's own list. */
  state?: ListState;
  /** Paths (exact, or prefixes ending in "/") whose answers `state` changes. */
  listPaths?: string[];
}

function isList(path: string, listPaths: string[]) {
  return listPaths.some((p) =>
    p.endsWith("/") ? path.startsWith(p) : path === p,
  );
}

function empty(path: string, url: URL): unknown {
  if (path === "/reports/daily-summary") return emptyShop.summary;
  if (path === "/reports/purchases" || path === "/reports/sales") {
    return url.searchParams.get("groupBy") === "commodity"
      ? emptyShop.byCommodity
      : emptyBook;
  }
  if (path === "/reports/outstanding") return emptyShop.outstanding;
  if (path === "/reports/commission") return emptyCommission;
  if (path === "/reports/cash-book" || path === "/payments/cash-book") {
    return emptyCashBook;
  }
  if (path === "/rates/today") {
    return {
      date: "2026-11-06",
      data: [],
      yesterday: { date: "2026-11-05", data: [] },
    };
  }
  if (path === "/ledger/balances") {
    return {
      data: [],
      totals: { receivable: "0.00", payable: "0.00" },
      meta: { page: 1, limit: 20, total: 0 },
    };
  }
  if (path.startsWith("/ledger/")) {
    return statement({
      data: [],
      openingBalance: "0.00",
      closingBalance: "0.00",
    });
  }
  if (path.endsWith("/lookup")) return { data: [] };
  return list([]);
}

function answer(
  method: string,
  path: string,
  url: URL,
  { user = owner, lang = "en" }: ShopServerOptions,
): unknown {
  const ur = lang === "ur";
  if (
    method === "POST" &&
    (path === "/auth/refresh" || path === "/auth/login")
  ) {
    return session("token-screens", user);
  }
  if (path === "/auth/me") return user;
  if (path === "/settings") return { ...shopSettings, language: lang };
  if (path === "/subscription") return shopStates.quiet;
  if (path === "/health") return { status: "ok" };

  if (path === "/reports/daily-summary") return dailySummary;
  if (path === "/reports/purchases") {
    const groupBy = url.searchParams.get("groupBy");
    if (url.searchParams.get("from") === url.searchParams.get("to")) {
      return groupBy === "commodity" ? purchasesByCommodity : purchasesByDay;
    }
    if (groupBy === "commodity") return monthPurchasesByCommodity;
    if (groupBy === "trader") return monthPurchasesByTrader;
    return url.searchParams.get("from") === "2026-11-01"
      ? monthPurchases
      : purchasesByDay;
  }
  if (path === "/reports/sales") {
    return url.searchParams.get("from") === "2026-11-01"
      ? monthSales
      : salesByDay;
  }
  if (path === "/reports/outstanding") {
    return url.searchParams.get("limit") ? outstanding : fullOutstanding;
  }
  if (path === "/reports/commission") return monthCommission;
  if (path === "/reports/cash-book") {
    return url.searchParams.get("from") === url.searchParams.get("to")
      ? todayCashBook
      : monthCashBook;
  }
  if (path === "/payments/cash-book") return todayCashBook;

  if (path === "/rates/today") {
    return {
      date: "2026-11-06",
      data: todaysRates,
      yesterday: { date: "2026-11-05", data: yesterdaysRates },
    };
  }
  if (path === "/rates") {
    const id = url.searchParams.get("commodity");
    // Commodities without their own history follow Gandum's.
    const data = id
      ? (rateHistories[id] ??
        rateHistories[commodityIds.wheat].map((r) => ({
          ...r,
          commodityId: id,
        })))
      : Object.values(rateHistories).flat();
    return list(data, 500);
  }
  if (method === "PUT" && path.startsWith("/rates/")) {
    return { date: "2026-11-06", data: todaysRates };
  }

  if (path === "/commodities/lookup") {
    // Same ids as the commodities list, so today's rates fill in.
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    return {
      data: [
        { ...gandumItem, id: commodityIds.wheat },
        { ...chanaItem, id: commodities[4].id },
        lookupItem(commodities[0]),
        lookupItem(commodities[3]),
      ].filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.nameUr?.includes(q),
      ),
    };
  }
  if (path === "/commodities") return list(commodities, 100);

  if (path === "/traders/lookup") {
    const type = url.searchParams.get("type");
    const kissan = ur ? { ...KISSAN, name: "محمد رفیق" } : KISSAN;
    const rows = [kissan, BEOPARI, ...lookupTraders.slice(2)];
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    return {
      data: rows.filter(
        (t) =>
          (!type || t.type === type) &&
          (!q ||
            t.name.toLowerCase().includes(q) ||
            (t.phone ?? "").includes(q)),
      ),
    };
  }
  if (path === `/traders/${BEOPARI.id}`) return beopariDetail();
  if (path.startsWith("/traders/")) {
    const id = path.split("/")[2];
    return traders.find((t) => t.id === id) ?? traders[0];
  }
  if (path === "/traders") {
    const type = url.searchParams.get("type");
    return list(type ? traders.filter((t) => t.type === type) : traders);
  }

  if (path === "/purchases") {
    if (url.searchParams.get("trader")) {
      return list(
        purchaseRows.filter(
          (r) => r.status === "posted" && r.outstanding !== "0.00",
        ),
        100,
      );
    }
    return list(purchaseRows);
  }
  if (path.startsWith("/purchases/")) return ur ? urduPurchase : purchase;
  if (path === "/sales") {
    if (url.searchParams.get("buyer")) {
      return list(
        saleRows.filter(
          (r) => r.status === "posted" && r.outstanding !== "0.00",
        ),
        100,
      );
    }
    return list(saleRows);
  }
  if (path.startsWith("/sales/")) return sale;
  if (path === "/payments") return list(payments);
  if (path.startsWith("/payments/")) return payment;

  if (path === "/ledger/balances") return balances(balanceRows);
  if (path.startsWith("/ledger/")) {
    return statement(
      ur ? { trader: { ...statement().trader, name: "محمد رفیق" } } : {},
    );
  }

  if (path === "/staff/invitations") return list(invitations);
  if (path === "/staff") return list(staff);

  return null;
}

const cors = (origin: string | null) => ({
  "access-control-allow-origin": origin ?? "*",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers":
    "authorization, content-type, accept, idempotency-key",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
});

/** Answers every API call of the page from the fake shop. */
export async function shopServer(page: Page, options: ShopServerOptions = {}) {
  const { state = "data", listPaths = [] } = options;
  await page.route(`${API}/**`, async (route: Route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (method === "GET" && state !== "data" && isList(path, listPaths)) {
      // "loading": never answer; the page shows its skeleton for good.
      if (state === "loading") return;
      if (state === "error") {
        await route.fulfill({
          status: 500,
          headers,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 500,
            message: "Internal server error",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify(empty(path, url)),
      });
      return;
    }
    const body = answer(method, path, url, options);
    await route.fulfill({
      status: body === null ? 404 : method === "POST" ? 201 : 200,
      headers,
      contentType: "application/json",
      body: JSON.stringify(body ?? { statusCode: 404, message: "Not found" }),
    });
  });
}

/** Signed in as `user`, with `lang` chosen for this browser and user. */
export async function signIn(
  context: BrowserContext,
  { user = owner, lang = "en" }: { user?: User; lang?: Lang } = {},
) {
  const cookie = (name: string, value: string) => ({
    name,
    value,
    domain: "localhost",
    path: "/",
  });
  await context.addCookies([
    cookie("gm_locale", lang),
    cookie("gm_uid", user.id),
    cookie(`gm_locale_${user.id}`, lang),
  ]);
  await setRefreshCookie(context);
}

/** Fixed clock, no chart animation, then the fake shop. */
export async function preparePage(
  page: Page,
  context: BrowserContext,
  options: ShopServerOptions = {},
) {
  await page.clock.setFixedTime(NOW);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(context, options);
  await shopServer(page, options);
}

export { commodityIds, KISSAN, BEOPARI, purchase, sale, payment, traders };
