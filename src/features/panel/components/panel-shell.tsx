"use client";

import { type ReactNode, useEffect } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useMe } from "@/features/auth/hooks";
import { useSessionStore } from "@/stores/session";
import { useUiStore } from "@/stores/ui";
import { panelText } from "../text";
import { AppSidebar } from "./app-sidebar";
import { CommandPalette, usePaletteShortcut } from "./command-palette";
import { PanelHeader } from "./panel-header";

export const MAIN_CONTENT_ID = "main-content";

/** Skip link, sidebar, header and Ctrl+K palette around every panel page. */
export function PanelShell({ children }: { children: ReactNode }) {
  const sessionUser = useSessionStore((s) => s.user);
  const me = useMe();
  const user = me.data ?? sessionUser;
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  // Saved sidebar choice is read after mount, so server and client HTML match.
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);
  usePaletteShortcut();

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="bg-primary text-primary-foreground focus-visible:ring-ring/50 sr-only z-50 rounded-lg px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus-visible:ring-4"
      >
        {panelText.skipToContent}
      </a>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0">
        <PanelHeader user={user} />
        <div
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 outline-none sm:p-6 lg:p-8"
        >
          {children}
        </div>
      </SidebarInset>
      <CommandPalette user={user} />
    </SidebarProvider>
  );
}
