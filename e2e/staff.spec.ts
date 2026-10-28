import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  mockEndpoint,
  owner,
  rolePermissions,
  session,
  setRefreshCookie,
} from "./mock-api";

const manager = {
  ...owner,
  id: "u2",
  name: "Nadeem",
  phone: "03000000003",
  role: "manager",
  permissions: rolePermissions.manager,
};

type ShopUser = typeof owner;

async function signedIn(page: Page, context: BrowserContext, user: ShopUser) {
  await setRefreshCookie(context);
  await mockEndpoint(page, "POST", "/auth/refresh", () => ({
    status: 200,
    body: session("token-a", user),
  }));
  await mockEndpoint(page, "GET", "/auth/me", () => ({
    status: 200,
    body: user,
  }));
}

const ownerRow: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  isYou: boolean;
} = {
  id: "u1",
  name: owner.name,
  phone: owner.phone,
  email: null,
  role: "owner",
  isActive: true,
  lastLoginAt: "2026-10-27T10:30:00.000Z",
  mustChangePassword: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  isYou: true,
};

const TOKEN = "tok-e2e-123";
const INVITE_URL = `http://localhost:3000/accept-invite?token=${TOKEN}`;
const PHONE = "03011234567";

test.describe("staff management", () => {
  test("owner invites an operator → they accept → owner deactivates them", async ({
    page,
    context,
    browser,
  }) => {
    // What the fake server knows; updated by the mocked calls below.
    const staff: (typeof ownerRow)[] = [ownerRow];
    const invitations: Record<string, unknown>[] = [];

    await signedIn(page, context, owner);
    await mockEndpoint(page, "GET", "/staff", () => ({
      status: 200,
      body: { data: staff },
    }));
    await mockEndpoint(page, "GET", "/staff/invitations", () => ({
      status: 200,
      body: { data: invitations },
    }));
    const invites = await mockEndpoint(
      page,
      "POST",
      "/staff/invitations",
      (request) => {
        const body = request.postDataJSON();
        const invitation = {
          id: "i1",
          phone: body.phone,
          role: body.role,
          status: "pending",
          invitedBy: "u1",
          expiresAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
          createdAt: new Date().toISOString(),
        };
        invitations.unshift(invitation);
        return {
          status: 201,
          body: { method: "link", invitation, inviteUrl: INVITE_URL },
        };
      },
    );
    const deactivations = await mockEndpoint(
      page,
      "POST",
      "/staff/*/deactivate",
      () => {
        staff[1] = { ...staff[1], isActive: false };
        return { status: 200, body: staff[1] };
      },
    );

    // Owner → Staff → invite an operator by link.
    await page.goto("/staff");
    await expect(
      page.getByRole("heading", { level: 1, name: "Staff" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Haji Aslam You" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Invite staff" }).click();
    const form = page.getByRole("dialog", { name: "Invite staff" });
    await form.getByLabel("Phone number").fill("0301 1234567");
    await expect(form.getByRole("combobox", { name: "Role" })).toHaveText(
      "Operator",
    );
    await form.getByRole("button", { name: "Send invite" }).click();

    const result = page.getByRole("alertdialog", { name: "Invite link ready" });
    await expect(result.getByLabel("Invite link")).toHaveValue(INVITE_URL);
    await expect(
      result.getByRole("link", { name: "Share on WhatsApp" }),
    ).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
    expect(invites[0].postDataJSON()).toEqual({
      phone: PHONE,
      role: "operator",
      method: "link",
    });
    await result.getByRole("button", { name: "Done" }).click();
    await expect(result).toBeHidden();
    await expect(page.getByLabel("Invite link")).toHaveCount(0);

    await page.getByRole("tab", { name: "Pending invitations" }).click();
    await expect(
      page.getByRole("cell", { name: PHONE, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();

    // The invited person opens the link on their own device.
    const visitor = await browser.newContext();
    const invitee = await visitor.newPage();
    const accepts = await mockEndpoint(
      invitee,
      "POST",
      "/auth/accept-invite",
      () => {
        staff.push({
          ...ownerRow,
          id: "u3",
          name: "Bilal",
          phone: PHONE,
          role: "operator",
          lastLoginAt: null,
          isYou: false,
        });
        invitations[0] = { ...invitations[0], status: "accepted" };
        return { status: 201, body: { phone: PHONE, shopName: "Demo Mandi" } };
      },
    );
    await invitee.goto(INVITE_URL);
    await expect(
      invitee.getByRole("heading", { name: "You’re invited to join" }),
    ).toBeVisible();
    // The token never stays in the address bar.
    await expect(invitee).toHaveURL("/accept-invite");

    await invitee.getByLabel("Your full name").fill("Bilal");
    await invitee
      .getByLabel("New password", { exact: true })
      .fill("bilal-pass-1");
    await invitee.getByLabel("Confirm new password").fill("bilal-pass-1");
    await invitee.getByRole("button", { name: /Join shop/ }).click();

    await expect(
      invitee.getByRole("heading", { name: "You’re in, Demo Mandi" }),
    ).toBeVisible();
    expect(accepts[0].postDataJSON()).toEqual({
      token: TOKEN,
      name: "Bilal",
      password: "bilal-pass-1",
    });
    await invitee.getByRole("link", { name: /Continue to sign in/ }).click();
    await expect(invitee).toHaveURL(`/login?phone=${PHONE}`);
    await expect(invitee.getByLabel("Phone number or email")).toHaveValue(
      PHONE,
    );
    await visitor.close();

    // Back as the owner: deactivate the new operator.
    await page.reload();
    const bilal = page.getByRole("row", { name: /Bilal/ });
    await expect(bilal).toContainText("Active");
    await page.getByRole("button", { name: "Actions for Bilal" }).click();
    await page.getByRole("menuitem", { name: "Deactivate" }).click();
    const confirm = page.getByRole("alertdialog", {
      name: "Deactivate Bilal?",
    });
    await expect(confirm).toContainText("signed out at once");
    await confirm.getByRole("button", { name: "Deactivate" }).click();

    await expect(confirm).toBeHidden();
    await expect(bilal).toContainText("Disabled");
    expect(deactivations[0].url()).toMatch(/\/staff\/u3\/deactivate$/);

    // Owners can't deactivate themselves.
    await page.getByRole("button", { name: "Actions for Haji Aslam" }).click();
    await expect(
      page.getByRole("menuitem", { name: /Deactivate/ }),
    ).toBeDisabled();
    await expect(page.getByText("You can’t deactivate yourself")).toBeVisible();
  });

  test("manager opening /staff gets 403", async ({ page, context }) => {
    await signedIn(page, context, manager);
    const lists = await mockEndpoint(page, "GET", "/staff", () => ({
      status: 403,
      body: { statusCode: 403, message: "Forbidden" },
    }));

    await page.goto("/staff");

    await expect(
      page.getByRole("heading", { level: 1, name: "You don’t have access" }),
    ).toBeVisible();
    await expect(page.getByText("403")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Invite staff" }),
    ).toHaveCount(0);
    expect(lists).toHaveLength(0);
  });
});
