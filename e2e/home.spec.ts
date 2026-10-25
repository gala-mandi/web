import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Galla Mandi");
  await expect(
    page.getByRole("heading", { name: "Galla Mandi" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toBeVisible();
});
