import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BrandPanel } from "@/components/brand-panel";
import { LanguageSwitch } from "@/components/language-switch";

/**
 * Brand panel on the start side, the screen's card on the end side, with the
 * English / اردو switch above the card (screens 1.1, 2.1).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const t = useTranslations("auth");
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-wrap">
      <div className="flex flex-[1_1_520px]">
        <BrandPanel />
      </div>
      <main className="flex flex-[1_1_480px] flex-col items-center gap-6 px-4 py-7 sm:px-6">
        <div className="flex w-full max-w-[560px] items-center justify-start">
          <LanguageSwitch />
        </div>
        <div className="flex w-full flex-auto items-center justify-center">
          {children}
        </div>
        <p className="text-muted-foreground text-[12.5px]">
          {t("login.copyright")}
        </p>
      </main>
    </div>
  );
}
