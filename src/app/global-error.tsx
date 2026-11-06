"use client";

import "./globals.css";
import { type Messages, NextIntlClientProvider } from "next-intl";
import { ErrorState } from "@/features/panel/components/status-pages";
import { localeDirection } from "@/i18n/config";
import { wantedLocale } from "@/i18n/client";
import { SHOP_TIME_ZONE } from "@/lib/format";
import en from "../../messages/en.json";
import ur from "../../messages/ur.json";

/**
 * Last-resort boundary when the root layout itself fails: it renders its own
 * `<html>` without the root provider, so it reads the language from this
 * browser's cookies and carries only the error words.
 */
export default function GlobalError({ retry }: { retry: () => void }) {
  const locale = wantedLocale();
  const messages = {
    panel: { error: (locale === "ur" ? ur : en).panel.error },
  };
  return (
    <html lang={locale} dir={localeDirection[locale]}>
      <head>
        <title>{messages.panel.error.title}</title>
      </head>
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-4 font-sans">
        <NextIntlClientProvider
          locale={locale}
          messages={messages as unknown as Messages}
          timeZone={SHOP_TIME_ZONE}
        >
          <div className="w-full max-w-lg">
            <ErrorState retry={retry} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
