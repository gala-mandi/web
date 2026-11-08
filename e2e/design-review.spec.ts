import fs from "node:fs";
import path from "node:path";
import { type Browser, type Page, test } from "@playwright/test";
import {
  authScreens,
  fontsReady,
  messages,
  chooseLanguage,
} from "./auth-screens";
import { themes } from "../src/lib/theme";
import { renderDesign } from "./design-canvas";

/**
 * Visual review of the auth screens against the design files (ticket 40).
 * Not part of the normal run: `DESIGN_REVIEW=1 npm run test:e2e --
 * e2e/design-review.spec.ts --workers=1`. For every screen it saves one
 * picture per size to docs/design/review-shots/: the design, then the built
 * page in English and in Urdu, side by side (full-size shots stay in
 * test-results/design-review/). The findings are in docs/design/auth-review.md.
 */

const OUT = path.resolve("docs/design/review-shots");
const RAW = path.resolve("test-results/design-review");
const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, fullPage: false },
  phone: { viewport: { width: 390, height: 844 }, fullPage: true },
} as const;
/** Phone pages are cut at two screens so the pictures stay small. */
const PHONE_MAX_HEIGHT = 1700;

test.skip(!process.env.DESIGN_REVIEW, "Run with DESIGN_REVIEW=1");
// Six pictures and three page loads per screen.
test.describe.configure({ timeout: 180_000 });

async function snap(page: Page, fullPage: boolean): Promise<Buffer> {
  await fontsReady(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  // Let focus rings and entry transitions settle.
  await page.waitForTimeout(300);
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const width = page.viewportSize()?.width ?? 390;
  return page.screenshot(
    fullPage
      ? {
          fullPage: true,
          clip: {
            x: 0,
            y: 0,
            width,
            height: Math.min(height, PHONE_MAX_HEIGHT),
          },
        }
      : {},
  );
}

/** The pictures side by side with a caption each, scaled down. */
async function compose(
  browser: Browser,
  panes: { label: string; png: Buffer }[],
  paneWidth: number,
  file: string,
) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 600 },
  });
  const figures = panes
    .map(
      ({ label, png }) =>
        `<figure><figcaption>${label}</figcaption><img src="data:image/png;base64,${png.toString("base64")}"></figure>`,
    )
    .join("");
  await page.setContent(
    `<style>body{margin:0;font:600 13px system-ui,sans-serif;background:#fff}
#c{display:inline-flex;flex-wrap:wrap;max-width:1500px;gap:12px;padding:12px;align-items:flex-start}
figure{margin:0;display:flex;flex-direction:column;gap:6px}
img{width:${paneWidth}px;border:1px solid #dcd8e6}</style><div id="c">${figures}</div>`,
  );
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((r) => (img.onload = r)),
      ),
    ),
  );
  await page.locator("#c").screenshot({ path: file });
  await page.close();
}

for (const screen of authScreens) {
  test(`${screen.id} ${screen.title}`, async ({ browser }) => {
    fs.mkdirSync(OUT, { recursive: true });
    fs.mkdirSync(RAW, { recursive: true });
    const slug = `${screen.id}-${screen.design}`;
    for (const [size, { viewport, fullPage }] of Object.entries(SIZES)) {
      const panes: { label: string; png: Buffer }[] = [];

      const designPage = await browser.newPage({ viewport });
      await designPage.goto(renderDesign(screen.design, `${RAW}/html`));
      panes.push({
        label: `Design ${screen.id}`,
        png: await snap(designPage, fullPage),
      });
      await designPage.close();

      for (const lang of ["en", "ur"] as const) {
        const context = await browser.newContext({
          viewport,
          baseURL: "http://localhost:3000",
        });
        const page = await context.newPage();
        await chooseLanguage(context, lang);
        await screen.open(page, context, messages[lang]);
        panes.push({
          label: `Built ${screen.route} — ${lang === "en" ? "English" : "Urdu"}`,
          png: await snap(page, fullPage),
        });
        await context.close();
      }

      panes.forEach(({ png }, i) =>
        fs.writeFileSync(`${RAW}/${slug}-${size}-${i}.png`, png),
      );
      await compose(
        browser,
        panes,
        size === "desktop" ? 470 : 250,
        `${OUT}/${slug}-${size}.png`,
      );
    }
  });
}

test("the six themes on the sign-in screen", async ({ browser }) => {
  const panes: { label: string; png: Buffer }[] = [];
  for (const theme of themes) {
    const context = await browser.newContext({
      viewport: SIZES.desktop.viewport,
      baseURL: "http://localhost:3000",
    });
    await context.addCookies([
      { name: "gm_theme", value: theme, domain: "localhost", path: "/" },
    ]);
    const page = await context.newPage();
    await authScreens[0].open(page, context, messages.en);
    panes.push({ label: `Theme: ${theme}`, png: await snap(page, false) });
    await context.close();
  }
  await compose(browser, panes, 470, `${OUT}/themes-sign-in.png`);
});
