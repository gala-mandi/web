import type { Page } from "@playwright/test";

/**
 * Text that doesn't fit its box (cut off or pushed over a neighbour):
 * buttons, badges, inputs, menu items, labels and table headers whose
 * content is wider or taller than the box, without a scrollbar of their own.
 */
export async function overflowingText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selector = [
      "button:not([role=checkbox]):not([role=radio])",
      "a[data-slot=button]",
      "[data-slot=badge]",
      "input",
      "label",
      "th",
      "[data-sidebar=menu-button]",
      "[role=tab]",
    ].join(",");
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden") continue;
      // Screen-reader-only text (sr-only) is a 1×1 clipped box on purpose.
      if (box.width <= 1 && box.height <= 1) continue;
      // Text meant to be cut with "…" is fine.
      if (style.textOverflow === "ellipsis") continue;
      const wide = el.scrollWidth - el.clientWidth > 1;
      const tall =
        el.tagName !== "INPUT" &&
        style.overflowY !== "visible" &&
        el.scrollHeight - el.clientHeight > 1;
      if (wide || tall) {
        out.push(
          `${el.tagName.toLowerCase()} "${(el.textContent || (el as HTMLInputElement).value || "").trim().slice(0, 40)}" ${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight}`,
        );
      }
    }
    return out;
  });
}
