import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { themes } from "@/lib/theme";

/**
 * Ticket 40: body text keeps at least 4.5:1 contrast in all six themes. The
 * colours are read from globals.css itself, so a changed token is checked.
 */

// jsdom gives import.meta.url an http: scheme; tests run from the repo root.
const css = readFileSync(resolve("src/app/globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escaped} \\{([^}]*)\\}`, "m").exec(css);
  if (!match) throw new Error(`No ${selector} block in globals.css`);
  const vars: Record<string, string> = {};
  for (const [, name, value] of match[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[name] = value.trim();
  }
  return vars;
}

const root = block(":root");

function tokens(theme: string): Record<string, string> {
  return { ...root, ...block(`[data-theme="${theme}"]`) };
}

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(match[1].slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [text, background, where it is used]. */
const pairs: [string, string, string][] = [
  ["foreground", "background", "text on the page"],
  ["foreground", "card", "text on a card"],
  ["muted-foreground", "card", "secondary text on a card"],
  ["muted-foreground", "background", "secondary text on the page"],
  ["muted-foreground", "secondary", "inactive language switch"],
  ["primary", "card", "links and accent text on a card"],
  ["primary", "background", "links on the page"],
  ["primary-foreground", "primary", "button text (gradient start)"],
  ["primary-foreground", "primary-to", "button text (gradient end)"],
  ["secondary-foreground", "secondary", "text on a tint"],
  ["destructive", "card", "error text"],
  ["destructive", "destructive-soft", "error box"],
  ["success", "card", "success text"],
  ["notice", "notice-soft", "shop suspended badge"],
];

describe.each(themes)("%s theme", (theme) => {
  const t = tokens(theme);
  it.each(pairs)("%s on %s (%s) is at least 4.5:1", (text, bg) => {
    expect(contrast(t[text], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("brand panel (white text over the gradient)", () => {
  it.each(themes)("%s", (theme) => {
    const t = tokens(theme);
    // The panel's lightest point is --brand-to at 85% over the photo; its
    // text is checked against the pure gradient colours.
    expect(contrast("#ffffff", t["brand-from"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", t["brand-to"])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("theme tokens match the design (docs/design/README.md)", () => {
  const design = {
    violet: ["#6d28d9", "#9333ea", "#4c1d95", "#9333ea"],
    indigo: ["#4338ca", "#7c3aed", "#312e81", "#6d28d9"],
    blue: ["#1d4ed8", "#2563eb", "#1e3a8a", "#2563eb"],
    green: ["#065f46", "#047857", "#064e3b", "#047857"],
    red: ["#be123c", "#e11d48", "#881337", "#e11d48"],
    dark: ["#18181b", "#3f3f46", "#18181b", "#3f3f46"],
  } as const;
  it.each(themes)("%s", (theme) => {
    const t = tokens(theme);
    expect([
      t.primary,
      t["primary-to"],
      t["brand-from"],
      t["brand-to"],
    ]).toEqual(design[theme]);
    expect(t.ring).toBe(t.primary);
  });
  it("shared tokens", () => {
    expect(root).toMatchObject({
      background: "#f6f3ff",
      card: "#ffffff",
      foreground: "#1e1b2e",
      "muted-foreground": "#5b5668",
      border: "#dcd8e6",
      destructive: "#be123c",
      success: "#047857",
    });
    expect(css).toMatch(/--radius-card: 1\.5rem;/);
    expect(css).toMatch(/--radius-field: 0\.75rem;/);
  });
});
