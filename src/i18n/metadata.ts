import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { MessageKey } from "./types";

/** `<title>` of a page, "<page> — Galla Mandi", in the interface language. */
export async function pageTitle(title: string): Promise<string> {
  const t = await getTranslations("panel");
  return t("pageTitle", { title });
}

/**
 * `generateMetadata` for a page titled by one message, e.g.
 * `export const generateMetadata = pageMetadata("panel.sections.traders.label")`.
 */
export function pageMetadata(key: MessageKey) {
  return async function generateMetadata(): Promise<Metadata> {
    // Only plain messages (no arguments) name a page.
    const t = (await getTranslations()) as unknown as (
      key: MessageKey,
    ) => string;
    return { title: await pageTitle(t(key)) };
  };
}
