import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  API,
  mockEndpoint,
  operator,
  owner,
  rolePermissions,
  session,
  setRefreshCookie,
  shopSettings,
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

type Settings = typeof shopSettings;

const LOGO_URL = `${API}/uploads/t1/logo.png`;
// 1×1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/** "2.5" → "2.50", like the server's numeric columns. */
function fixed(value: string, places: number): string {
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(places, "0").slice(0, places)}`;
}

/**
 * A fake shop server: `/auth/*`, `GET/PATCH /settings` and
 * `POST /settings/logo`, keeping the settings across reloads.
 */
async function shop(page: Page, context: BrowserContext, user: ShopUser) {
  const state = { settings: { ...shopSettings } as Settings };

  await setRefreshCookie(context);
  await mockEndpoint(page, "POST", "/auth/refresh", () => ({
    status: 200,
    body: session("token-a", user),
  }));
  const me = await mockEndpoint(page, "GET", "/auth/me", () => ({
    status: 200,
    body: {
      ...user,
      tenant: {
        ...user.tenant,
        name: state.settings.name,
        logoUrl: state.settings.logoUrl,
      },
    },
  }));
  const gets = await mockEndpoint(page, "GET", "/settings", () =>
    user.role === "owner"
      ? { status: 200, body: state.settings }
      : { status: 403, body: { statusCode: 403, message: "Forbidden" } },
  );
  const patches = await mockEndpoint(page, "PATCH", "/settings", (request) => {
    const body = request.postDataJSON() as Partial<Settings>;
    const next = { ...state.settings, ...body };
    for (const [field, places] of [
      ["defaultCommissionPct", 2],
      ["marketFeePct", 2],
      ["labourPerBag", 2],
      ["maundKg", 3],
    ] as const) {
      if (field in body) next[field] = fixed(next[field], places);
    }
    state.settings = { ...next, updatedAt: new Date().toISOString() };
    return { status: 200, body: state.settings };
  });
  const uploads = await mockEndpoint(page, "POST", "/settings/logo", () => {
    state.settings = { ...state.settings, logoUrl: LOGO_URL };
    return { status: 201, body: state.settings };
  });
  await page.route(LOGO_URL, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG }),
  );

  return { state, me, gets, patches, uploads };
}

async function openSettings(page: Page) {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { level: 1, name: "Settings" }),
  ).toBeVisible();
  await expect(page.getByLabel("Commission", { exact: true })).toHaveValue(
    "2.50",
  );
}

test.describe("shop settings", () => {
  test("owner changes commission and parchi → preview updates → saved after reload", async ({
    page,
    context,
  }) => {
    const server = await shop(page, context, owner);
    await openSettings(page);

    const preview = page.getByTestId("parchi-preview");
    const save = page.getByRole("button", { name: "Save changes" });
    await expect(preview.getByTestId("preview-title")).toHaveText("Demo Mandi");
    await expect(preview.getByTestId("preview-bill")).toHaveText("0001");
    await expect(save).toBeDisabled();

    // Change the commission and what the parchi shows.
    await page.getByLabel("Commission", { exact: true }).fill("3.5");
    await page
      .getByLabel("Name on parchi", { exact: true })
      .fill("Aslam Traders");
    await page.getByLabel("City", { exact: true }).fill("Sahiwal");
    await page.getByLabel("Bill number prefix", { exact: true }).fill("MND");
    await page
      .getByLabel("Footer text", { exact: true })
      .fill("Shukriya! Bank: HBL 1234");

    // The live preview follows the typing.
    await expect(preview.getByTestId("preview-title")).toHaveText(
      "Aslam Traders",
    );
    await expect(preview.getByTestId("preview-address")).toHaveText(
      "Shop 12, Grain Market, Sahiwal",
    );
    await expect(preview.getByTestId("preview-bill")).toHaveText("MND-0001");
    await expect(preview.getByTestId("preview-footer")).toHaveText(
      "Shukriya! Bank: HBL 1234",
    );
    await expect(
      page.getByText("Next bill looks like MND-0001."),
    ).toBeVisible();
    await expect(page.getByText("You have unsaved changes")).toBeVisible();

    const meBefore = server.me.length;
    await save.click();

    await expect(page.getByText("Settings saved")).toBeVisible();
    expect(server.patches).toHaveLength(1);
    expect(server.patches[0].postDataJSON()).toEqual({
      defaultCommissionPct: "3.5",
      displayName: "Aslam Traders",
      city: "Sahiwal",
      billPrefix: "MND",
      parchiFooter: "Shukriya! Bank: HBL 1234",
    });
    // The server's "3.50" replaces what was typed; nothing left to save.
    await expect(page.getByLabel("Commission", { exact: true })).toHaveValue(
      "3.50",
    );
    await expect(save).toBeDisabled();
    // The header's shop info (`/auth/me`) was refreshed.
    expect(server.me.length).toBeGreaterThan(meBefore);

    // A new page load shows what was saved, on the form and on the parchi.
    await page.reload();
    await expect(page.getByLabel("Commission", { exact: true })).toHaveValue(
      "3.50",
    );
    await expect(
      page.getByLabel("Name on parchi", { exact: true }),
    ).toHaveValue("Aslam Traders");
    await expect(page.getByLabel("Footer text", { exact: true })).toHaveValue(
      "Shukriya! Bank: HBL 1234",
    );
    await expect(preview.getByTestId("preview-title")).toHaveText(
      "Aslam Traders",
    );
    await expect(preview.getByTestId("preview-address")).toHaveText(
      "Shop 12, Grain Market, Sahiwal",
    );
    await expect(preview.getByTestId("preview-bill")).toHaveText("MND-0001");
    await expect(preview.getByTestId("preview-footer")).toHaveText(
      "Shukriya! Bank: HBL 1234",
    );
    await expect(save).toBeDisabled();
  });

  test("a new shop name shows in the header after saving", async ({
    page,
    context,
  }) => {
    await shop(page, context, owner);
    await openSettings(page);
    await expect(page.getByTestId("shop-name")).toHaveText("Demo Mandi");

    await page.getByLabel("Shop name", { exact: true }).fill("Aslam & Sons");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByTestId("shop-name")).toHaveText("Aslam & Sons");
  });

  test("units hint converts with the shop's kg per maund", async ({
    page,
    context,
  }) => {
    await shop(page, context, owner);
    await openSettings(page);

    await expect(page.getByText("Example: 1,000 kg = 25 mn")).toBeVisible();
    await page.getByLabel("Kg in one maund", { exact: true }).fill("37.324");
    await expect(
      page.getByText("Example: 1,000 kg = 26 mn 29.576 kg"),
    ).toBeVisible();
  });

  test("a server field error shows on that field", async ({
    page,
    context,
  }) => {
    await shop(page, context, owner);
    // Registered last, so it answers before the default handler.
    const refused = await mockEndpoint(page, "PATCH", "/settings", () => ({
      status: 400,
      body: {
        statusCode: 400,
        message: "Validation failed",
        errors: [
          { field: "billPrefix", message: "This prefix is already in use" },
        ],
      },
    }));
    await openSettings(page);

    const prefix = page.getByLabel("Bill number prefix", { exact: true });
    await prefix.fill("MND");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("This prefix is already in use")).toBeVisible();
    await expect(prefix).toHaveAttribute("aria-invalid", "true");
    await expect(prefix).toBeFocused();
    await expect(prefix).toHaveValue("MND");
    await expect(page.getByText("Settings saved")).toHaveCount(0);
    expect(refused).toHaveLength(1);
  });

  test("logo: PNG uploads as multipart; 5 MB or a PDF is refused", async ({
    page,
    context,
  }) => {
    const server = await shop(page, context, owner);
    await openSettings(page);
    const input = page.getByTestId("logo-input");
    const error = page.locator("#logo-error");

    await input.setInputFiles({
      name: "big.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024),
    });
    await expect(error).toHaveText("The logo must be 1 MB or smaller");

    await input.setInputFiles({
      name: "logo.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n"),
    });
    await expect(error).toHaveText("The logo must be a PNG or JPG image");
    expect(server.uploads).toHaveLength(0);

    await input.setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: PNG,
    });

    await expect(page.getByText("Logo updated")).toBeVisible();
    await expect(error).toHaveCount(0);
    expect(server.uploads).toHaveLength(1);
    const upload = server.uploads[0];
    expect(upload.headers()["content-type"]).toMatch(
      /^multipart\/form-data; boundary=/,
    );
    const body = upload.postDataBuffer()?.toString("latin1") ?? "";
    expect(body).toContain('name="file"; filename="logo.png"');
    expect(body).toContain("Content-Type: image/png");
    await expect(
      page.getByTestId("parchi-preview").getByTestId("shop-logo"),
    ).toHaveAttribute("src", LOGO_URL);

    // Remove it again.
    await page.getByRole("button", { name: "Remove logo" }).click();
    await expect(page.getByText("Logo removed")).toBeVisible();
    expect(server.patches.at(-1)?.postDataJSON()).toEqual({ logoUrl: null });
    await expect(page.getByTestId("shop-logo")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove logo" })).toHaveCount(
      0,
    );
  });

  test("the server's logo error is shown", async ({ page, context }) => {
    await shop(page, context, owner);
    await mockEndpoint(page, "POST", "/settings/logo", () => ({
      status: 413,
      body: {
        statusCode: 413,
        code: "FILE_TOO_LARGE",
        message: "The logo must be 1 MB or smaller",
      },
    }));
    await openSettings(page);

    await page.getByTestId("logo-input").setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: PNG,
    });

    await expect(page.locator("#logo-error")).toHaveText(
      "The logo must be 1 MB or smaller",
    );
  });

  for (const user of [manager, operator]) {
    test(`${user.role} opening /settings gets 403`, async ({
      page,
      context,
    }) => {
      const server = await shop(page, context, user);

      await page.goto("/settings");

      await expect(
        page.getByRole("heading", { level: 1, name: "You don’t have access" }),
      ).toBeVisible();
      await expect(page.getByText("403")).toBeVisible();
      await expect(page.getByLabel("Commission", { exact: true })).toHaveCount(
        0,
      );
      expect(server.gets).toHaveLength(0);
    });
  }
});
