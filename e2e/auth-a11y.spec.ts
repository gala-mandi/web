import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  authScreens,
  fontsReady,
  type Lang,
  messages,
  chooseLanguage,
} from "./auth-screens";
import { overflowingText } from "./text-fit";

/**
 * Ticket 40 (auth screens sign-off): keyboard order and a visible focus ring
 * on the sign-in form, touch targets of at least 44 px at phone width, no
 * clipped Nastaliq on any auth screen in Urdu, and the theme swatches.
 */

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

/** Outline, ring and border of a control (and of the input group around it). */
async function focusLook(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const boxes = [el, el.closest("[data-slot=input-group]")].filter(
      (x): x is Element => x !== null,
    );
    return boxes
      .map((box) => {
        const s = getComputedStyle(box);
        return [
          s.outlineStyle,
          s.outlineWidth,
          s.outlineColor,
          s.boxShadow,
          s.borderColor,
        ].join(" ");
      })
      .join(" / ");
  });
}

async function tabOrder(page: Page, stops: Locator[]) {
  const unfocused = [];
  for (const stop of stops) unfocused.push(await focusLook(stop));
  for (const [i, stop] of stops.entries()) {
    await page.keyboard.press("Tab");
    await expect(stop).toBeFocused();
    // The ring fades in (150 ms transitions).
    await page.waitForTimeout(250);
    expect(
      await focusLook(stop),
      `focus ring on stop ${i + 1}: ${await stop.evaluate((el) => el.outerHTML.slice(0, 80))}`,
    ).not.toBe(unfocused[i]);
  }
}

test.describe("sign-in keyboard order", () => {
  for (const lang of ["en", "ur"] as const) {
    test(`Tab goes language → phone → forgot → password → show → remember → submit → themes (${lang})`, async ({
      page,
      context,
    }) => {
      const m = messages[lang].auth;
      await chooseLanguage(context, lang);
      await page.goto("/login");
      await expect(
        page.getByRole("heading", { name: m.login.title }),
      ).toBeVisible();

      await tabOrder(page, [
        page.getByRole("button", { name: "English" }),
        page.getByRole("button", { name: "اردو" }),
        page.getByLabel(m.login.identifierLabel),
        page.getByRole("link", { name: m.login.forgotPassword }),
        page.getByLabel(m.login.passwordLabel, { exact: true }),
        page.getByRole("button", { name: m.password.show }),
        page.getByRole("checkbox", { name: m.login.rememberMe }),
        page.getByRole("button", { name: new RegExp(m.login.submit) }),
        ...(["violet", "indigo", "blue", "green", "red", "dark"] as const).map(
          (theme) => page.getByRole("button", { name: m.login.theme[theme] }),
        ),
      ]);
    });
  }

  test("Enter in the password field submits the form", async ({ page }) => {
    let posted = 0;
    await page.route("http://localhost:4000/auth/login", (route) => {
      if (route.request().method() === "POST") posted += 1;
      return route.fulfill({
        status: 401,
        headers: { "access-control-allow-origin": "http://localhost:3000" },
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 401, message: "Invalid" }),
      });
    });
    await page.goto("/login");
    await page.getByLabel("Phone number or email").fill("03000000002");
    await page.getByLabel("Password", { exact: true }).fill("x-password");
    await page.keyboard.press("Enter");
    await expect.poll(() => posted).toBe(1);
  });
});

/** Visible controls smaller than 44 × 44 px (a checkbox counts with its label). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const controls = document.querySelectorAll<HTMLElement>(
      "button, input:not([type=hidden]), select, textarea, a[data-slot=button]",
    );
    for (const el of controls) {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      let box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (el.getAttribute("aria-hidden") === "true") continue;
      // A button inside a sentence is exempt (WCAG 2.5.8 "inline").
      const parent = el.parentElement;
      if (
        parent &&
        [...parent.childNodes].some(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
        )
      ) {
        continue;
      }
      // A checkbox or radio is hit through its label as well.
      const role = el.getAttribute("role");
      if ((role === "checkbox" || role === "radio") && el.id) {
        const label =
          el.closest("label") ??
          document.querySelector(`label[for="${el.id}"]`);
        if (label) {
          const l = label.getBoundingClientRect();
          box = DOMRect.fromRect({
            x: Math.min(box.x, l.x),
            y: Math.min(box.y, l.y),
            width: Math.max(box.right, l.right) - Math.min(box.x, l.x),
            height: Math.max(box.bottom, l.bottom) - Math.min(box.y, l.y),
          });
        }
      }
      // A text box counts with the input group it fills.
      const group = el.closest("[data-slot=input-group]");
      if (el.tagName === "INPUT" && group) box = group.getBoundingClientRect();
      if (box.height < 43.5 || box.width < 43.5) {
        const name =
          el.getAttribute("aria-label") ||
          el.textContent?.trim() ||
          el.getAttribute("name") ||
          el.tagName;
        out.push(
          `${el.tagName.toLowerCase()} "${name.slice(0, 30)}" ${Math.round(box.width)}×${Math.round(box.height)}`,
        );
      }
    }
    return out;
  });
}

/**
 * Urdu (Arabic-script) text inside a box that cuts its overflow: the tall
 * Nastaliq letters would be clipped.
 */
async function clippedUrdu(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const urdu = /[؀-ۿ]/;
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const text = el.textContent ?? "";
      if (!urdu.test(text) || el.children.length > 0) continue;
      const style = getComputedStyle(el);
      if (style.overflowY === "visible" && style.overflowX === "visible") {
        continue;
      }
      if (style.textOverflow === "ellipsis") continue;
      const box = el.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1) continue;
      if (el.scrollHeight - el.clientHeight > 1) {
        out.push(
          `${el.tagName.toLowerCase()} "${text.trim().slice(0, 30)}" ${el.scrollHeight} > ${el.clientHeight}`,
        );
      }
    }
    return out;
  });
}

test.describe("touch targets at phone width", () => {
  test.use({ viewport: PHONE });
  for (const screen of authScreens) {
    test(`${screen.id} ${screen.title}: every button and input is at least 44 px`, async ({
      page,
      context,
    }) => {
      await chooseLanguage(context, "en");
      await screen.open(page, context, messages.en);
      await fontsReady(page);
      expect(await smallTargets(page)).toEqual([]);
      // …and nothing pushes the page wider than the phone.
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("Urdu: nothing clipped on the auth screens", () => {
  for (const [size, viewport] of Object.entries({ DESKTOP, PHONE })) {
    for (const screen of authScreens) {
      test(`${screen.id} ${screen.title} (${size.toLowerCase()})`, async ({
        page,
        context,
      }) => {
        await page.setViewportSize(viewport);
        const lang: Lang = "ur";
        await chooseLanguage(context, lang);
        await screen.open(page, context, messages[lang]);
        await fontsReady(page);
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        expect(await overflowingText(page)).toEqual([]);
        expect(await clippedUrdu(page)).toEqual([]);
      });
    }
  }
});

test.describe("themes", () => {
  test("a swatch recolours the page at once and stays after a reload", async ({
    page,
  }) => {
    await page.goto("/login");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "violet");
    const submit = page.getByRole("button", { name: /sign in/i });
    await expect(submit).toHaveCSS("background-image", /rgb\(109, 40, 217\)/);

    await page.getByRole("button", { name: "Green theme" }).click();
    await expect(html).toHaveAttribute("data-theme", "green");
    await expect(submit).toHaveCSS("background-image", /rgb\(6, 95, 70\)/);
    await expect(
      page.getByRole("button", { name: "Green theme" }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "green");
    await expect(
      page.getByRole("button", { name: "Green theme" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("link", { name: "Forgot password?" }),
    ).toHaveCSS("color", "rgb(6, 95, 70)");
  });
});
