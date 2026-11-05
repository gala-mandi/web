import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  mockEndpoint,
  operator,
  owner,
  session,
  setRefreshCookie,
  shopSettings,
} from "./mock-api";

type ShopUser = typeof owner;

interface Commodity {
  id: string;
  name: string;
  nameUr: string | null;
  category: string | null;
  defaultUnit: "kg" | "maund" | "bag";
  bagWeightKg: string | null;
  commissionPct: string | null;
  marketFeePct: string | null;
  labourPerBag: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const kapas: Commodity = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Kapas",
  nameUr: "کپاس",
  category: "fibre",
  defaultUnit: "maund",
  bagWeightKg: null,
  commissionPct: null,
  marketFeePct: null,
  labourPerBag: null,
  isActive: true,
  createdAt: "2026-10-01T05:00:00.000Z",
  updatedAt: "2026-10-01T05:00:00.000Z",
};

const NEW_ID = "22222222-2222-4222-8222-222222222222";
const NAME_TAKEN = "Another commodity in this shop has this name";

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

/** "2.5" → "2.50", like the server's numeric columns; null and "" stay null. */
function fixed(value: string | null | undefined, places: number) {
  if (value === null || value === undefined || value === "") return null;
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(places, "0")}`;
}

/** The body as the server stores it. */
function stored(body: Partial<Commodity>): Partial<Commodity> {
  const out: Partial<Commodity> = { ...body };
  if ("bagWeightKg" in body) out.bagWeightKg = fixed(body.bagWeightKg, 3);
  for (const field of [
    "commissionPct",
    "marketFeePct",
    "labourPerBag",
  ] as const) {
    if (field in body) out[field] = fixed(body[field], 2);
  }
  return out;
}

/** A fake commodities API that keeps its commodities across requests. */
async function commoditiesApi(page: Page) {
  const commodities: Commodity[] = [{ ...kapas }];

  await mockEndpoint(page, "GET", "/settings", () => ({
    status: 200,
    body: shopSettings,
  }));

  const gets = await mockEndpoint(page, "GET", "/commodities**", (request) => {
    const url = new URL(request.url());
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const active = url.searchParams.get("active");
    const rows = commodities.filter(
      (c) =>
        (c.name.toLowerCase().includes(search) ||
          (c.nameUr ?? "").includes(search)) &&
        (active === null || String(c.isActive) === active),
    );
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    return {
      status: 200,
      body: { data: rows, meta: { page, limit, total: rows.length } },
    };
  });

  const creates = await mockEndpoint(
    page,
    "POST",
    "/commodities",
    (request) => {
      const body = request.postDataJSON();
      if (
        commodities.some(
          (c) => c.name.toLowerCase() === body.name.toLowerCase(),
        )
      ) {
        return {
          status: 409,
          body: {
            statusCode: 409,
            message: NAME_TAKEN,
            code: "NAME_TAKEN",
            errors: [{ field: "name", message: NAME_TAKEN }],
          },
        };
      }
      const now = new Date().toISOString();
      const created = {
        ...stored(body),
        id: NEW_ID,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as Commodity;
      commodities.push(created);
      return { status: 201, body: created };
    },
  );

  const patches = await mockEndpoint(
    page,
    "PATCH",
    "/commodities/*",
    (request) => {
      const id = new URL(request.url()).pathname.split("/")[2];
      const index = commodities.findIndex((c) => c.id === id);
      commodities[index] = {
        ...commodities[index],
        ...stored(request.postDataJSON()),
      };
      return { status: 200, body: commodities[index] };
    },
  );

  return { gets, creates, patches };
}

test.describe("commodities", () => {
  test("owner adds Gandum / گندم with a 100 kg bag → edits charges → deactivates → searches", async ({
    page,
    context,
  }) => {
    await signedIn(page, context, owner);
    const api = await commoditiesApi(page);

    await page.goto("/commodities");
    await expect(
      page.getByRole("heading", { level: 1, name: "Commodities" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit Kapas" }),
    ).toBeVisible();

    // Add, first with a name the shop already has.
    await page.getByRole("button", { name: "Add commodity" }).click();
    const sheet = page.getByRole("dialog", { name: "Add commodity" });
    await expect(
      sheet.getByText("Shop default: 2.50%. Leave empty to use it."),
    ).toBeVisible();
    const name = sheet.getByLabel(/^Name/);
    await name.fill("kapas");
    await sheet.getByRole("button", { name: "Add commodity" }).click();
    await expect(sheet.getByText(NAME_TAKEN)).toBeVisible();
    await expect(name).toHaveAttribute("aria-invalid", "true");

    await name.fill("Gandum");
    const urdu = sheet.getByLabel(/^Urdu name/);
    await expect(urdu).toHaveAttribute("dir", "rtl");
    await urdu.fill("گندم");
    await sheet.getByLabel(/^Category/).fill("grain");
    await sheet.getByRole("combobox", { name: "Default unit" }).click();
    await page.getByRole("option", { name: "Bag (bori)" }).click();
    await sheet.getByLabel(/^Bag weight/).fill("100");
    await sheet.getByRole("button", { name: "Add commodity" }).click();

    await expect(sheet).toBeHidden();
    await expect(page.getByText("Gandum added.")).toBeVisible();
    expect(api.creates.at(-1)?.postDataJSON()).toEqual({
      name: "Gandum",
      nameUr: "گندم",
      category: "grain",
      defaultUnit: "bag",
      bagWeightKg: "100",
      commissionPct: null,
      marketFeePct: null,
      labourPerBag: null,
    });
    const row = page.getByRole("row", { name: /Gandum/ });
    await expect(row).toContainText("گندم");
    await expect(row).toContainText("Grain");
    await expect(row).toContainText("Bag");
    await expect(row).toContainText("100 kg");
    await expect(row).toContainText("Shop default");

    // Edit charges: only the changed fields go to the server.
    await page.getByRole("button", { name: "Edit Gandum" }).click();
    const edit = page.getByRole("dialog", { name: "Edit Gandum" });
    await edit.getByRole("textbox", { name: /^Commission/ }).fill("3");
    await edit.getByRole("textbox", { name: /^Labour per bag/ }).fill("20");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(edit).toBeHidden();
    expect(api.patches[0].postDataJSON()).toEqual({
      commissionPct: "3",
      labourPerBag: "20",
    });
    await expect(row).toContainText("Commission 3.00%");
    await expect(row).toContainText("Labour per bag Rs 20.00");

    // Back to the shop default for the commission.
    await page.getByRole("button", { name: "Edit Gandum" }).click();
    await edit
      .getByRole("button", { name: "Commission: use shop default" })
      .click();
    await expect(
      edit.getByRole("textbox", { name: /^Commission/ }),
    ).toHaveValue("");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(edit).toBeHidden();
    expect(api.patches[1].postDataJSON()).toEqual({ commissionPct: null });
    await expect(row).not.toContainText("Commission");
    await expect(row).toContainText("Labour per bag Rs 20.00");

    // Deactivate: stays in the list with an Inactive badge.
    await page.getByRole("button", { name: "Actions for Gandum" }).click();
    await page.getByRole("menuitem", { name: "Deactivate" }).click();
    const confirm = page.getByRole("alertdialog", {
      name: "Deactivate Gandum?",
    });
    await confirm.getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByText("Gandum is deactivated.")).toBeVisible();
    expect(api.patches[2].postDataJSON()).toEqual({ isActive: false });
    await expect(row).toContainText("Inactive");

    // Search by name: the URL keeps it.
    await page.getByLabel("Search commodities").fill("gan");
    await expect(page).toHaveURL(/[?&]q=gan/);
    await expect(page.getByRole("button", { name: "Edit Kapas" })).toHaveCount(
      0,
    );
    await expect(row).toBeVisible();
    expect(
      api.gets.some(
        (r) => new URL(r.url()).searchParams.get("search") === "gan",
      ),
    ).toBe(true);
  });

  test("operator opening /commodities gets 403", async ({ page, context }) => {
    await signedIn(page, context, operator);
    const api = await commoditiesApi(page);

    await page.goto("/commodities");

    await expect(
      page.getByRole("heading", { level: 1, name: "You don’t have access" }),
    ).toBeVisible();
    await expect(page.getByText("403")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add commodity" }),
    ).toHaveCount(0);
    expect(api.gets).toHaveLength(0);
  });
});
