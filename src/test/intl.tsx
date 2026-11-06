import { NextIntlClientProvider } from "next-intl";
import { Direction } from "radix-ui";
import type { ReactNode } from "react";
import { type Locale, localeDirection } from "@/i18n/config";
import { SHOP_TIME_ZONE } from "@/lib/format";
import en from "../../messages/en.json";
import ur from "../../messages/ur.json";

export const testMessages = { en, ur } as const;

let current: Locale = "en";

/**
 * The language every component test renders in: English unless a test
 * switches it (reset after each test in `vitest.setup.ts`). Also sets
 * `<html lang dir>` like the root layout.
 */
export function setTestLocale(locale: Locale): void {
  current = locale;
  document.documentElement.lang = locale;
  document.documentElement.dir = localeDirection[locale];
}

export function testLocale(): Locale {
  return current;
}

/** What the root layout gives every page: messages, locale and direction. */
export function IntlProviders({
  children,
  locale = current,
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={testMessages[locale]}
      timeZone={SHOP_TIME_ZONE}
    >
      <Direction.Provider dir={localeDirection[locale]}>
        {children}
      </Direction.Provider>
    </NextIntlClientProvider>
  );
}
