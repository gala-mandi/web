import type { ReactNode } from "react";
import { BrandPanel } from "@/components/brand-panel";
import { brandText } from "@/features/auth/text";

/** Brand panel on the start side, the screen's card on the end side. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-wrap">
      <div className="flex flex-[1_1_520px]">
        <BrandPanel />
      </div>
      <main className="flex flex-[1_1_480px] flex-col items-center gap-6 px-4 py-7 sm:px-6">
        <div className="flex w-full flex-auto items-center justify-center">
          {children}
        </div>
        <p className="text-muted-foreground text-[12.5px]">
          © {brandText.name}
        </p>
      </main>
    </div>
  );
}
