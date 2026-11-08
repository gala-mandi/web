import { type BrowserContext, expect, type Page } from "@playwright/test";
import en from "../messages/en.json";
import ur from "../messages/ur.json";
import { mockEndpoint, owner, session, setRefreshCookie } from "./mock-api";

/**
 * Every auth screen of the shop panel brought into the state its design
 * shows (ticket 40): used by the accessibility checks and the visual review.
 * All API calls are mocked.
 */

export type Lang = "en" | "ur";
type Messages = typeof ur;

// The English file is typed with its literal strings; both have the same keys.
export const messages: Record<Lang, Messages> = {
  en: en as unknown as Messages,
  ur,
};

export interface AuthScreen {
  /** Number from docs/design/README.md. */
  id: string;
  title: string;
  /** docs/design/auth/<design>.dc.html */
  design: string;
  route: string;
  open: (page: Page, context: BrowserContext, m: Messages) => Promise<void>;
}

/** The sign-in screens remember the last language in this cookie. */
export async function chooseLanguage(context: BrowserContext, lang: Lang) {
  await context.addCookies([
    { name: "gm_locale", value: lang, domain: "localhost", path: "/" },
  ]);
}

async function fillSignIn(page: Page, m: Messages) {
  await page.getByLabel(m.auth.login.identifierLabel).fill("0300 0000002");
  await page
    .getByLabel(m.auth.login.passwordLabel, { exact: true })
    .fill("demo-password");
  await page
    .getByRole("button", { name: new RegExp(m.auth.login.submit) })
    .click();
}

async function toCodeStep(page: Page, m: Messages) {
  await mockEndpoint(page, "POST", "/auth/forgot-password", () => ({
    status: 200,
    body: { message: "sent", expiresIn: 600, resendIn: 60 },
  }));
  await page.goto("/forgot-password");
  await page.getByLabel(m.auth.forgot.request.phoneLabel).fill("3001234567");
  await page
    .getByRole("button", { name: new RegExp(m.auth.forgot.request.submit) })
    .click();
  await expect(
    page.getByRole("heading", { name: m.auth.forgot.code.title }),
  ).toBeVisible();
}

async function toPasswordStep(page: Page, m: Messages) {
  await toCodeStep(page, m);
  await page.getByRole("textbox").first().click();
  await page.keyboard.type("482916");
  await page
    .getByRole("button", { name: new RegExp(m.auth.forgot.code.submit) })
    .click();
  await expect(
    page.getByRole("heading", { name: m.auth.forgot.newPassword.title }),
  ).toBeVisible();
}

export const authScreens: AuthScreen[] = [
  {
    id: "1.1",
    title: "Sign in",
    design: "Main",
    route: "/login",
    open: async (page, _context, m) => {
      await page.goto("/login");
      await expect(
        page.getByRole("heading", { name: m.auth.login.title }),
      ).toBeVisible();
    },
  },
  {
    id: "1.2",
    title: "Sign in — wrong password",
    design: "SignInError",
    route: "/login (401)",
    open: async (page, _context, m) => {
      await mockEndpoint(page, "POST", "/auth/login", () => ({
        status: 401,
        body: { statusCode: 401, message: "Invalid credentials" },
        headers: { "x-ratelimit-remaining": "2" },
      }));
      await page.goto("/login");
      await fillSignIn(page, m);
      await expect(
        page.getByText(m.auth.login.errors.invalidCredentials),
      ).toBeVisible();
    },
  },
  {
    id: "1.3",
    title: "Too many attempts",
    design: "LockedOut",
    route: "/login (429)",
    open: async (page, _context, m) => {
      await mockEndpoint(page, "POST", "/auth/login", () => ({
        status: 429,
        body: { statusCode: 429, message: "Too many attempts" },
        headers: { "retry-after": "60" },
      }));
      await page.goto("/login");
      await fillSignIn(page, m);
      await expect(page.getByRole("timer").first()).toBeVisible();
    },
  },
  {
    id: "2.1",
    title: "Forgot password",
    design: "ForgotPassword",
    route: "/forgot-password",
    open: async (page, _context, m) => {
      await page.goto("/forgot-password");
      await expect(
        page.getByRole("heading", { name: m.auth.forgot.request.title }),
      ).toBeVisible();
    },
  },
  {
    id: "2.2",
    title: "Verify OTP",
    design: "VerifyOtp",
    route: "/forgot-password (code step)",
    open: async (page, _context, m) => toCodeStep(page, m),
  },
  {
    id: "2.3",
    title: "Set new password",
    design: "NewPassword",
    route: "/forgot-password (new password step)",
    open: async (page, _context, m) => {
      await toPasswordStep(page, m);
      await page
        .getByLabel(m.auth.password.newLabel, { exact: true })
        .fill("Mandi2026");
    },
  },
  {
    id: "2.4",
    title: "Password changed",
    design: "PasswordChanged",
    route: "/forgot-password (done)",
    open: async (page, _context, m) => {
      await mockEndpoint(page, "POST", "/auth/reset-password", () => ({
        status: 200,
        body: { revokedSessions: 2 },
      }));
      await toPasswordStep(page, m);
      await page
        .getByLabel(m.auth.password.newLabel, { exact: true })
        .fill("Mandi@2026x");
      await page
        .getByLabel(m.auth.password.confirmLabel, { exact: true })
        .fill("Mandi@2026x");
      await page
        .getByRole("button", {
          name: new RegExp(m.auth.forgot.newPassword.submit),
        })
        .click();
      await expect(
        page.getByRole("heading", { name: m.auth.passwordChanged.title }),
      ).toBeVisible();
    },
  },
  {
    id: "3.1",
    title: "Accept staff invite",
    design: "AcceptInvite",
    route: "/accept-invite?token=…",
    open: async (page) => {
      await page.goto("/accept-invite?token=invite-token-1");
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expect(page).toHaveURL("/accept-invite");
    },
  },
  {
    id: "3.2",
    title: "First login — change password",
    design: "ChangeTempPassword",
    route: "/change-password",
    open: async (page, context, m) => {
      const staff = {
        ...owner,
        name: "Bilal",
        role: "operator",
        mustChangePassword: true,
      };
      await setRefreshCookie(context);
      await mockEndpoint(page, "POST", "/auth/refresh", () => ({
        status: 200,
        body: session("token-a", staff),
      }));
      await mockEndpoint(page, "GET", "/auth/me", () => ({
        status: 200,
        body: staff,
      }));
      await page.goto("/change-password");
      await expect(
        page.getByRole("heading", {
          name: m.auth.changePassword.mustChange.title,
        }),
      ).toBeVisible();
    },
  },
  {
    id: "3.3",
    title: "Session expired",
    design: "SessionExpired",
    route: "/login?reason=session-expired",
    open: async (page, _context, m) => {
      await page.goto("/login?reason=session-expired");
      await expect(
        page.getByText(m.auth.login.sessionExpired.title),
      ).toBeVisible();
    },
  },
  {
    id: "4.1",
    title: "Shop suspended",
    design: "ShopSuspended",
    route: "/shop-suspended",
    open: async (page, _context, m) => {
      await page.goto("/shop-suspended");
      await expect(
        page.getByText(m.auth.blocked.shopSuspended.badge).first(),
      ).toBeVisible();
    },
  },
  {
    id: "4.2",
    title: "Account disabled",
    design: "AccountDisabled",
    route: "/account-disabled",
    open: async (page, _context, m) => {
      await page.goto("/account-disabled");
      await expect(
        page.getByRole("heading", {
          name: m.auth.blocked.accountDisabled.title,
        }),
      ).toBeVisible();
    },
  },
];

/** Waits for the web fonts (Nastaliq loads late) before measuring. */
export async function fontsReady(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
