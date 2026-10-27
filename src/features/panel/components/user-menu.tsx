"use client";

import { ChevronDown, LogOut, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout, useLogoutAll } from "@/features/auth/hooks";
import type { User } from "@/features/auth/types";
import { panelText } from "../text";
import { initials } from "./shop-logo";

const t = panelText.userMenu;

/** Avatar button with the user's name and role; opens the Log out options. */
export function UserMenu({ user }: { user: User }) {
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  const busy = logout.isPending || logoutAll.isPending;
  const role = panelText.roles[user.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`${t.label}: ${user.name}, ${role}`}
          className="h-11 gap-2.5 rounded-xl px-1.5 sm:pe-2.5"
        >
          <Avatar>
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden flex-col items-start text-start leading-tight sm:flex">
            <span className="text-sm font-semibold" data-testid="user-name">
              {user.name}
            </span>
            <span
              className="text-muted-foreground text-xs font-normal"
              data-testid="user-role"
            >
              {role}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="text-muted-foreground hidden sm:block"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-foreground text-sm font-semibold">
            {user.name}
          </span>
          <span className="text-muted-foreground text-xs font-normal">
            {role} · {user.email ?? user.phone}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={busy} onSelect={() => logout.mutate()}>
            <LogOut aria-hidden />
            {t.logout}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={busy}
            onSelect={() =>
              logoutAll.mutate(undefined, {
                onError: () => toast.error(t.logoutAllFailed),
              })
            }
          >
            <MonitorSmartphone aria-hidden />
            {t.logoutAll}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
