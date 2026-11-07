import { describe, expect, it, vi } from "vitest";

const locale = { current: "en" as "en" | "ur" };

vi.mock("next/font/google", () => {
  const font = (variable: string) => () => ({ variable, className: variable });
  return {
    Inter: font("font-inter"),
    Plus_Jakarta_Sans: font("font-jakarta"),
    Noto_Nastaliq_Urdu: font("font-nastaliq"),
  };
});
vi.mock("next-intl/server", () => ({
  getLocale: async () => locale.current,
}));
vi.mock("./globals.css", () => ({}));

describe("root layout", () => {
  it.each([
    ["en", "ltr"],
    ["ur", "rtl"],
  ] as const)(
    "renders <html lang=%s dir=%s> on the server, so nothing flips after load",
    async (lang, dir) => {
      locale.current = lang;
      const { default: RootLayout } = await import("./layout");
      const html = await RootLayout({
        children: null,
        params: Promise.resolve({}),
      } as never);
      expect(html.type).toBe("html");
      expect(html.props.lang).toBe(lang);
      expect(html.props.dir).toBe(dir);
    },
  );
});
