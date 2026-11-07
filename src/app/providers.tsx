"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Direction } from "radix-ui";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { localeDirection } from "@/i18n/config";
import { getQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const dir = localeDirection[useLocale()];

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <Direction.Provider dir={dir}>
          <TooltipProvider>
            {children}
            <Toaster position="top-center" dir={dir} />
          </TooltipProvider>
        </Direction.Provider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
