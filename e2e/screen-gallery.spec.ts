import fs from "node:fs";
import path from "node:path";
import { type Browser, type Page, test } from "@playwright/test";
import sharp from "sharp";
import {
  messages,
  parchiPrints,
  screens,
  type Screen,
} from "./screens/catalog";
import {
  type Lang,
  type ListState,
  preparePage,
  purchase,
} from "./screens/shop-server";

/**
 * The screen gallery of ticket 42: every non-auth screen of the shop panel
 * as built, the design record the owner approves. Not part of the normal
 * run: build and start the app on port 3000, then
 * `DESIGN_REVIEW=1 npx playwright test e2e/screen-gallery.spec.ts --workers=1`.
 *
 * Per screen it saves `docs/design/screens/<module>/<id>-desktop.png` and
 * `-phone.png` (English | Urdu side by side, 1440 and 390 px), and for
 * every list `<id>-states-desktop.png` / `-phone.png` (empty | loading |
 * error, English). Parchi print layouts go to `parchi/`. Pictures are
 * palette-compressed; full-size shots stay in test-results/screens/.
 * The index is docs/design/screens/README.md.
 */

const OUT = path.resolve("docs/design/screens");
const RAW = path.resolve("test-results/screens");
const BASE = "http://localhost:3000";
const SIZES = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
} as const;
type Size = keyof typeof SIZES;
/** Long pages are cut so the pictures stay small. */
const MAX_HEIGHT: Record<Size, number> = { desktop: 1800, phone: 2400 };

test.skip(!process.env.DESIGN_REVIEW, "Run with DESIGN_REVIEW=1");
test.describe.configure({ timeout: 240_000 });

/** Waits for fonts and for the skeletons to go (unless loading is the point). */
async function settle(page: Page, state: ListState) {
  await page.locator("main, #main-content").first().waitFor();
  if (state !== "loading") {
    await page
      .locator("[data-slot=skeleton], .animate-pulse")
      .first()
      .waitFor({ state: "detached", timeout: 10_000 })
      .catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
  } else {
    await page.waitForTimeout(1_500);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

async function snap(page: Page, size: Size, full: boolean): Promise<Buffer> {
  const { width } = SIZES[size];
  if (!full) return page.screenshot();
  // Steps may have scrolled the page (a focused field); start at the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  return page.screenshot({
    fullPage: true,
    clip: { x: 0, y: 0, width, height: Math.min(height, MAX_HEIGHT[size]) },
  });
}

async function shoot(
  browser: Browser,
  screen: Screen,
  lang: Lang,
  size: Size,
  state: ListState,
): Promise<Buffer> {
  const context = await browser.newContext({
    viewport: SIZES[size],
    baseURL: BASE,
  });
  const page = await context.newPage();
  await preparePage(page, context, {
    user: screen.user,
    lang,
    state,
    listPaths: screen.listPaths,
  });
  await page.goto(screen.route);
  await settle(page, state);
  if (state === "data" && screen.act) {
    await screen.act(page, messages[lang], lang);
    await page.waitForTimeout(400);
  }
  const full =
    !(state === "data" && screen.overlay) &&
    (size === "phone" || !!screen.tall);
  const png = await snap(page, size, full);
  await context.close();
  return png;
}

/** Palette PNG: a tenth of the size, still sharp for text. */
async function savePng(png: Buffer, file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(png)
    .png({ palette: true, quality: 85, effort: 10, compressionLevel: 9 })
    .toFile(file);
}

/** The pictures side by side with a caption each, scaled to `paneWidth`. */
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
#c{display:inline-flex;gap:12px;padding:12px;align-items:flex-start}
figure{margin:0;display:flex;flex-direction:column;gap:6px;width:${paneWidth + 2}px}
figcaption{overflow-wrap:anywhere}
img{width:${paneWidth}px;border:1px solid #dcd8e6}</style><div id="c">${figures}</div>`,
  );
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((r) => (img.onload = r)),
      ),
    ),
  );
  const png = await page.locator("#c").screenshot();
  await page.close();
  await savePng(png, file);
}

const raw = (name: string, png: Buffer) => {
  fs.mkdirSync(RAW, { recursive: true });
  fs.writeFileSync(path.join(RAW, `${name}.png`), png);
};

const langName = { en: "English", ur: "Urdu" } as const;
const stateName = { empty: "Empty", loading: "Loading", error: "Error" };

for (const screen of screens) {
  test(`${screen.module}: ${screen.title}`, async ({ browser }) => {
    const dir = path.join(OUT, screen.module);
    for (const size of ["desktop", "phone"] as const) {
      const panes = [];
      for (const lang of ["en", "ur"] as const) {
        const png = await shoot(browser, screen, lang, size, "data");
        raw(`${screen.id}-${size}-${lang}`, png);
        panes.push({ label: `${langName[lang]} — ${screen.title}`, png });
      }
      await compose(
        browser,
        panes,
        size === "desktop" ? 720 : 390,
        path.join(dir, `${screen.id}-${size}.png`),
      );
    }
    if (!screen.listPaths) return;
    const states = screen.states ?? (["empty", "loading", "error"] as const);
    for (const size of ["desktop", "phone"] as const) {
      const panes = [];
      for (const state of states) {
        const png = await shoot(browser, screen, "en", size, state);
        raw(`${screen.id}-${state}-${size}`, png);
        panes.push({ label: `${stateName[state]} — ${screen.title}`, png });
      }
      await compose(
        browser,
        panes,
        size === "desktop" ? 480 : 260,
        path.join(dir, `${screen.id}-states-${size}.png`),
      );
    }
  });
}

test("parchi print layouts: A4, A5, 80 mm thermal, Urdu", async ({
  browser,
}) => {
  for (const print of parchiPrints) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      baseURL: BASE,
    });
    await context.addInitScript(
      (choice) => {
        localStorage.setItem(
          "gm-web-parchi",
          JSON.stringify({ state: choice, version: 0 }),
        );
      },
      { paper: print.paper, lang: print.lang },
    );
    const page = await context.newPage();
    await preparePage(page, context, { lang: "en" });
    await page.goto(`/purchases/${purchase.id}`);
    await settle(page, "data");
    const parchi = page.locator("[data-parchi]");
    await parchi.waitFor();
    // What the printer gets: print media, the sheet at its paper width.
    await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
    await page.setViewportSize({ width: print.width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const png = await parchi.screenshot();
    raw(print.id, png);
    await savePng(png, path.join(OUT, "parchi", `${print.id}.png`));
    await context.close();
  }
});
