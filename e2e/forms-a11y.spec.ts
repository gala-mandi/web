import { expect, type Locator, type Page, test } from "@playwright/test";
import { messages } from "./screens/catalog";
import { type Lang, preparePage } from "./screens/shop-server";
import { overflowingText } from "./text-fit";

/**
 * Ticket 42: keyboard order and fit of every form of the shop panel, in
 * English and Urdu. For each form:
 * - Tab walks the fields in reading order (top to bottom; left to right in
 *   English, right to left in Urdu), every stop shows a focus ring, and
 *   focus is never stuck: a page form lets Tab move on past its last
 *   control; a sheet or dialog keeps focus inside (modal) until Escape
 *   closes it and gives focus back to the button that opened it.
 * - Fields are the design's height (50 px on forms, 40–44 px in entry grids).
 * - At 390 px nothing scrolls sideways and no text is clipped.
 * Contrast is checked on the theme tokens (src/app/theme-contrast.test.ts).
 */

type Messages = (typeof messages)["en"];

interface FormCase {
  name: string;
  route: string;
  /** Opens the sheet or dialog; returns the button that opened it. */
  open?: (page: Page, m: Messages) => Promise<Locator>;
  /** Minimum height of text fields and selects (outside entry grids). */
  fieldHeight: number;
  /** Entry-grid cells (rates, bill items, allocations) may be this short. */
  gridHeight?: number;
  /** Steps before the walk, e.g. pick the trader so the bills show. */
  fill?: (page: Page, m: Messages) => Promise<void>;
}

const rowMenu = async (page: Page) => {
  const button = page.getByRole("row").nth(1).getByRole("button").last();
  await button.click();
  return button;
};

const forms: FormCase[] = [
  {
    name: "add trader",
    route: "/traders",
    fieldHeight: 50,
    open: async (page, m) => {
      const button = page.getByRole("button", {
        name: m.traders.list.addButton,
      });
      await button.click();
      return button;
    },
  },
  {
    name: "edit trader",
    route: "/traders",
    fieldHeight: 50,
    open: async (page, m) => {
      const button = await rowMenu(page);
      await page
        .getByRole("menuitem", { name: m.traders.actions.edit })
        .click();
      return button;
    },
  },
  {
    name: "add commodity",
    route: "/commodities",
    fieldHeight: 50,
    open: async (page, m) => {
      const button = page.getByRole("button", {
        name: m.commodities.list.addButton,
      });
      await button.click();
      return button;
    },
  },
  {
    name: "edit commodity",
    route: "/commodities",
    fieldHeight: 50,
    open: async (page) => {
      const button = await rowMenu(page);
      await page.getByRole("menuitem").first().click();
      return button;
    },
  },
  { name: "daily rates", route: "/rates", fieldHeight: 40, gridHeight: 40 },
  {
    name: "purchase entry",
    route: "/purchases/new",
    fieldHeight: 44,
    gridHeight: 44,
  },
  { name: "sale entry", route: "/sales/new", fieldHeight: 44, gridHeight: 44 },
  {
    name: "payment entry",
    route: "/payments/new?direction=paid",
    fieldHeight: 44,
    gridHeight: 40,
    fill: async (page, m) => {
      await page
        .getByRole("combobox", {
          name: m.payments.form.trader.paid,
          exact: true,
        })
        .click();
      await page
        .getByRole("option", { name: /Rafiq Ahmad|محمد رفیق/ })
        .first()
        .click();
      await expect(page.locator("main form table").first()).toBeVisible();
    },
  },
  {
    name: "staff invite",
    route: "/staff",
    fieldHeight: 50,
    open: async (page, m) => {
      const button = page
        .getByRole("button", { name: m.staff.inviteButton })
        .first();
      await button.click();
      return button;
    },
  },
  { name: "shop settings", route: "/settings", fieldHeight: 50 },
];

interface Stop {
  i: number;
  /** Focus came back to an earlier stop. */
  seen: boolean;
  /** The × of a sheet or dialog. */
  close: boolean;
  label: string;
  inScope: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** Which scrolling box the stop is in (positions compare inside one). */
  scroller: string;
  look: string;
}

/** Marks the focused element and reads where it is and how it looks. */
async function readStop(page: Page, i: number): Promise<Stop | null> {
  return page.evaluate((i) => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const seen = el.dataset.a11yStop !== undefined;
    if (!seen) el.dataset.a11yStop = String(i);
    const scope = document.querySelector("[data-a11y-scope]");
    const rect = el.getBoundingClientRect();
    // Position inside the nearest scrolling box, so a scrolled sheet body
    // still compares by layout, not by where it happens to be scrolled.
    let scroller: HTMLElement | null = el.parentElement;
    while (scroller && scroller !== document.body) {
      const s = getComputedStyle(scroller);
      if (
        /(auto|scroll)/.test(s.overflowY) &&
        scroller.scrollHeight > scroller.clientHeight
      ) {
        break;
      }
      scroller = scroller.parentElement;
    }
    const box = scroller && scroller !== document.body ? scroller : null;
    const dy = box ? box.scrollTop - box.getBoundingClientRect().top : scrollY;
    const dx = box
      ? box.scrollLeft - box.getBoundingClientRect().left
      : scrollX;
    if (box && !box.dataset.a11yScroller) {
      box.dataset.a11yScroller = String(
        document.querySelectorAll("[data-a11y-scroller]").length + 1,
      );
    }
    return {
      i: seen ? Number(el.dataset.a11yStop) : i,
      seen,
      close: el.matches("[data-slot=sheet-close], [data-slot=dialog-close]"),
      label:
        el.getAttribute("aria-label") ??
        (el as HTMLInputElement).labels?.[0]?.textContent?.trim() ??
        el.textContent?.trim().slice(0, 40) ??
        el.tagName,
      inScope: !!scope && scope.contains(el),
      top: rect.top + dy,
      bottom: rect.bottom + dy,
      left: rect.left + dx,
      right: rect.right + dx,
      scroller: box?.dataset.a11yScroller ?? "page",
      look: "",
    };
  }, i);
}

/** Ring, outline and border of a stop and of the two boxes around it. */
async function lookOf(page: Page, i: number): Promise<string> {
  return page.evaluate((i) => {
    const el = document.querySelector(`[data-a11y-stop="${i}"]`);
    if (!el) return "";
    const boxes = [el, el.parentElement, el.parentElement?.parentElement];
    return boxes
      .filter((b): b is HTMLElement => !!b)
      .map((b) => {
        const s = getComputedStyle(b);
        return [
          s.outlineStyle,
          s.outlineWidth,
          s.boxShadow,
          s.borderColor,
        ].join(" ");
      })
      .join(" / ");
  }, i);
}

/** Tab from the current focus, recording every stop inside the form. */
async function walk(page: Page, modal: boolean): Promise<Stop[]> {
  const stops: Stop[] = [];
  const settle = async (i: number) => {
    // The ring fades in (150 ms transitions).
    await page.waitForTimeout(300);
    return lookOf(page, i);
  };
  const first = await readStop(page, 0);
  if (first?.inScope) {
    first.look = await settle(0);
    stops.push(first);
  }
  for (let i = 1; i < 150; i++) {
    await page.keyboard.press("Tab");
    const next = await readStop(page, i);
    const prev = stops.at(-1);
    // Past the last control of the page: focus went to the browser.
    if (!next) {
      expect(modal, "focus left the dialog").toBe(false);
      return stops;
    }
    // A date field steps through its day, month and year parts.
    if (prev && next.i === prev.i) continue;
    if (next.inScope) {
      if (next.seen) {
        // Round again: right for a modal sheet, a trap on a page form.
        expect(modal, `Tab is stuck inside the form at "${next.label}"`).toBe(
          true,
        );
        return stops;
      }
      next.look = await settle(i);
      stops.push(next);
    } else if (stops.length > 0) {
      expect(modal, `focus left the dialog at "${next.label}"`).toBe(false);
      return stops;
    }
  }
  throw new Error(modal ? "Tab never came round" : "Tab never left the form");
}

/** Every stop looks different with focus than without (a visible ring). */
async function noRing(page: Page, stops: Stop[]): Promise<string[]> {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const out: string[] = [];
  for (const stop of stops) {
    if ((await lookOf(page, stop.i)) === stop.look) out.push(stop.label);
  }
  return out;
}

/** Each stop comes after the one before in reading order. */
function outOfOrder(stops: Stop[], rtl: boolean): string[] {
  const bad: string[] = [];
  for (let k = 1; k < stops.length; k++) {
    const a = stops[k - 1];
    const b = stops[k];
    if (a.scroller !== b.scroller) continue;
    // A sheet's or dialog's × comes last (after the footer buttons), as
    // Radix places it; Escape closes the sheet as well.
    if (b.close) continue;
    const below = b.top >= a.bottom - 4;
    const sameRow = b.top < a.bottom - 4 && b.bottom > a.top + 4;
    const onward = rtl ? b.right <= a.right + 4 : b.left >= a.left - 4;
    // Done with a column, on to the next one (e.g. the bill's totals).
    const nextColumn = rtl ? b.right <= a.left + 4 : b.left >= a.right - 4;
    if (below || (sameRow && onward) || nextColumn) continue;
    bad.push(`"${a.label}" → "${b.label}"`);
  }
  return bad;
}

/** Text fields and select boxes in the form shorter than `min` px. */
async function shortFields(page: Page, min: number, grid: number) {
  return page.evaluate(
    ([min, grid]) => {
      const scope = document.querySelector("[data-a11y-scope]");
      if (!scope) return ["no form"];
      const out: string[] = [];
      const fields = scope.querySelectorAll<HTMLElement>(
        "input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), [data-slot=select-trigger], [role=combobox]",
      );
      for (const el of fields) {
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        const inGrid = !!el.closest(
          "table, [role=grid], [data-entry-grid], fieldset fieldset",
        );
        const need = inGrid ? grid : min;
        if (box.height + 0.5 < need) {
          out.push(
            `${el.getAttribute("aria-label") ?? el.id ?? el.tagName} ${Math.round(box.height)}px < ${need}px`,
          );
        }
      }
      return out;
    },
    [min, grid] as const,
  );
}

async function openForm(page: Page, form: FormCase, m: Messages) {
  await page.goto(form.route);
  await page.locator("main").first().waitFor();
  await page.waitForLoadState("networkidle");
  const opener = form.open ? await form.open(page, m) : null;
  // A sheet's close button sits outside its <form>: the dialog is the scope.
  const scope = opener
    ? page.getByRole("dialog").first()
    : page.locator("main form").first();
  await expect(scope).toBeVisible();
  await scope.evaluate((el) => el.setAttribute("data-a11y-scope", ""));
  await form.fill?.(page, m);
  return { opener, scope };
}

for (const form of forms) {
  test.describe(`form: ${form.name}`, () => {
    for (const lang of ["en", "ur"] as Lang[]) {
      test(`keyboard order, focus ring, no trap (${lang})`, async ({
        page,
        context,
      }) => {
        const m = messages[lang];
        await page.setViewportSize({ width: 1440, height: 900 });
        await preparePage(page, context, { lang });
        const { opener } = await openForm(page, form, m);
        await page.evaluate(() => document.fonts.ready);
        if (!opener) {
          // Start just before the form: on the page's main region.
          await page
            .locator("main")
            .first()
            .evaluate((el) => {
              el.tabIndex = -1;
              el.focus();
            });
        } else {
          // A sheet focuses its first field (or itself) when it opens.
          await page.waitForTimeout(300);
        }
        const stops = await walk(page, !!opener);
        expect(stops.length, "the form has keyboard stops").toBeGreaterThan(2);
        expect(await noRing(page, stops), "stops without a focus ring").toEqual(
          [],
        );
        expect(outOfOrder(stops, lang === "ur")).toEqual([]);
        expect(
          await shortFields(
            page,
            form.fieldHeight,
            form.gridHeight ?? form.fieldHeight,
          ),
        ).toEqual([]);

        if (opener) {
          // Back inside the sheet (the ring check blurred it), then Escape.
          await page.locator(`[data-a11y-stop="${stops[0].i}"]`).focus();
          await page.keyboard.press("Escape");
          await expect(page.getByRole("dialog")).toBeHidden();
          await expect(opener).toBeFocused();
        }
      });
    }

    test("fits a 390 px phone in Urdu and English", async ({
      page,
      context,
    }) => {
      for (const lang of ["en", "ur"] as Lang[]) {
        await context.clearCookies();
        await page.unrouteAll({ behavior: "ignoreErrors" });
        await page.setViewportSize({ width: 390, height: 844 });
        await preparePage(page, context, { lang });
        await openForm(page, form, messages[lang]);
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `sideways scroll (${lang})`).toBeLessThanOrEqual(1);
        expect(await overflowingText(page), `clipped text (${lang})`).toEqual(
          [],
        );
      }
    });
  });
}
