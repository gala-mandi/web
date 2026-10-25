"use client";

import { LogOut, Wheat } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useLogout, useLogoutAll, useMe } from "@/features/auth/hooks";
import { brandText } from "@/features/auth/text";
import { useSessionStore } from "@/stores/session";
import { panelText } from "../text";
import { SideMenu } from "./side-menu";

/** Header (shop, user, role, logout) + role-based menu around panel pages. */
export function PanelShell({ children }: { children: ReactNode }) {
  const sessionUser = useSessionStore((s) => s.user);
  const me = useMe();
  const user = me.data ?? sessionUser;
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  const busy = logout.isPending || logoutAll.isPending;

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="bg-card flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Wheat aria-hidden className="size-5" />
          </div>
          <div className="flex flex-col">
            <span
              className="font-heading text-base font-extrabold"
              data-testid="shop-name"
            >
              {user?.tenant?.name ?? brandText.name}
            </span>
            <span className="text-muted-foreground text-xs">
              {brandText.name}
            </span>
          </div>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-3">
          {user ? (
            <div className="flex flex-col items-end text-end">
              <span className="text-sm font-semibold" data-testid="user-name">
                {user.name}
              </span>
              <span
                className="text-muted-foreground text-xs"
                data-testid="user-role"
              >
                {panelText.roles[user.role]}
              </span>
            </div>
          ) : null}
          <Button
            variant="outline"
            size="lg"
            onClick={() => logout.mutate()}
            disabled={busy}
          >
            <LogOut aria-hidden />
            {panelText.logout}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => logoutAll.mutate()}
            disabled={busy}
          >
            {panelText.logoutAll}
          </Button>
        </div>
        {logoutAll.isError ? (
          <p role="alert" className="text-destructive w-full text-end text-sm">
            {panelText.logoutAllFailed}
          </p>
        ) : null}
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="bg-card border-b p-3 lg:w-60 lg:border-e lg:border-b-0 lg:p-4">
          <SideMenu role={user?.role ?? null} />
        </aside>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
