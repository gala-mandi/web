"use client";

import "./globals.css";
import { ErrorState } from "@/features/panel/components/status-pages";
import { panelText } from "@/features/panel/text";

/** Last-resort boundary when the root layout itself fails. */
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <title>{panelText.error.title}</title>
      </head>
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-4 font-sans">
        <div className="w-full max-w-lg">
          <ErrorState retry={retry} />
        </div>
      </body>
    </html>
  );
}
