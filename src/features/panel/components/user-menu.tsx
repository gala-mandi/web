"use client";

import {
  ChevronDown,
  Languages,
  LogOut,
  MonitorSmartphone,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout, useLogoutAll } from "@/features/auth/hooks";
import type { User } from "@/features/auth/types";
import { isLocale, localeNames, locales } from "@/i18n/config";
import { useChangeLocale } from "@/i18n/use-change-locale";
import { initials } from "./shop-logo";

/**
 * Avatar button with the user's name and role; opens the language switch
 * (English / اردو, saved for this user on this browser) and Log out.
 */
export function UserMenu({ user }: { user: User }) {
  const t = useTranslations("panel");
  const tc = useTranslations("common");
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  const { locale, changeLocale } = useChangeLocale();
  const busy = logout.isPending || logoutAll.isPending;
  const role = t(`roles.${user.role}`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`${t("userMenu.label")}: ${user.name}, ${role}`}
          className="h-11 gap-2.5 rounded-xl px-1.5 sm:pe-2.5"
        >
          <Avatar>
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden flex-col items-start text-start leading-tight sm:flex">
            <bdi
              dir="auto"
              className="text-sm font-semibold"
              data-testid="user-name"
            >
              {user.name}
            </bdi>
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
          <bdi dir="auto" className="text-foreground text-sm font-semibold">
            {user.name}
          </bdi>
          <span className="text-muted-foreground text-xs font-normal">
            {role} · <bdi dir="ltr">{user.email ?? user.phone}</bdi>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
          <Languages aria-hidden className="size-4" />
          {tc("language")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => {
            if (isLocale(value)) changeLocale(value);
          }}
        >
          {locales.map((value) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              lang={value}
              className={value === "ur" ? "font-urdu" : "font-sans"}
            >
              {localeNames[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={busy} onSelect={() => logout.mutate()}>
            <LogOut aria-hidden className="rtl:-scale-x-100" />
            {t("userMenu.logout")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={busy}
            onSelect={() =>
              logoutAll.mutate(undefined, {
                onError: () => toast.error(t("userMenu.logoutAllFailed")),
              })
            }
          >
            <MonitorSmartphone aria-hidden />
            {t("userMenu.logoutAll")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
