import type { Metadata } from "next";
import { Inter, Noto_Nastaliq_Urdu, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { localeDirection } from "@/i18n/config";
import { resolveTheme, THEME_COOKIE } from "@/lib/theme";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

// The Urdu interface and the Urdu parchi/print text.
const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "600"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Galla Mandi",
  description: "Shop panel for galla mandi commission shops",
};

/**
 * The language comes from this browser's cookies, so every page renders per
 * request (`<html lang dir>` and the text are right from the first paint);
 * this opts the app out of the static-shell check.
 */
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  // The theme picked on this browser (sign-in screen), violet by default.
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      data-theme={theme}
      className={`${inter.variable} ${jakarta.variable} ${nastaliq.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
