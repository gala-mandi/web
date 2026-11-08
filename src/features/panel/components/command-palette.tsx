"use client";

import { useTranslations } from "next-intl";
import { Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { User } from "@/features/auth/types";
import { useTraderLookup } from "@/features/traders/hooks";
import { hasPermission } from "@/lib/can";
import { ledgerRoutes, traderRoutes } from "@/lib/routes";
import { useUiStore } from "@/stores/ui";
import { menuFor } from "../menu";

/** Ctrl+K (⌘K on Mac) toggles the palette, also while typing in a field. */
export function usePaletteShortcut() {
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "k" &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        setOpen(!useUiStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);
}

/** Header button that opens the palette (for mouse and touch users). */
export function PaletteButton() {
  const t = useTranslations("panel");
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  return (
    <Button
      variant="outline"
      onClick={() => setOpen(true)}
      aria-keyshortcuts="Control+K Meta+K"
      className="text-muted-foreground h-10 gap-2 rounded-xl px-2.5 lg:w-56 lg:justify-start lg:px-3"
    >
      <Search aria-hidden />
      <span className="sr-only lg:not-sr-only">{t("palette.open")}</span>
      <kbd
        aria-hidden
        className="bg-muted text-muted-foreground ms-auto hidden rounded-md px-1.5 py-0.5 font-sans text-[11px] font-semibold lg:inline"
      >
        {t("palette.shortcut")}
      </kbd>
    </Button>
  );
}

/**
 * Ctrl+K quick search: lists the pages the user may open (same gating as the
 * menu) and goes there on Enter. Arrow keys move, Esc closes and returns
 * focus. From two letters on it also finds traders by name or phone
 * (`GET /traders/lookup`) and opens their profile, or their khata for a
 * role that may read the khata but not manage traders.
 */
export function CommandPalette({
  user,
}: {
  user: Pick<User, "permissions"> | null;
}) {
  const t = useTranslations("panel");
  const router = useRouter();
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const pages = menuFor(user, t);
  const tt = useTranslations("traders");
  const traderHref = hasPermission(user, "trader.manage")
    ? traderRoutes.detail
    : hasPermission(user, "ledger.view")
      ? (id: string) => ledgerRoutes.khata(id)
      : null;
  const [search, setSearch] = useState("");
  const q = search.trim();
  const lookup = useTraderLookup(
    { q, limit: 6 },
    open && traderHref !== null && q.length >= 2,
  );
  const traders = q.length >= 2 ? (lookup.data ?? []) : [];
  const returnFocus = useRef<HTMLElement | null>(null);

  const go = (href: string) => {
    setOpen(false);
    setSearch("");
    router.push(href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0"
        // Opened from Ctrl+K or the header button (not a DialogTrigger), so
        // remember what had focus and give it back on close.
        onOpenAutoFocus={() => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("palette.title")}</DialogTitle>
          <DialogDescription>{t("palette.description")}</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput
            placeholder={t("palette.placeholder")}
            aria-label={t("palette.title")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t("palette.empty")}</CommandEmpty>
            <CommandGroup heading={t("palette.pages")}>
              {pages.map((page) => {
                const Icon = page.icon;
                return (
                  <CommandItem
                    key={page.key}
                    value={page.label}
                    onSelect={() => go(page.href)}
                  >
                    <Icon aria-hidden />
                    {page.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {traderHref ? (
              <CommandGroup heading={t("palette.traders")}>
                {q.length < 2 ? (
                  <CommandItem value="traders-hint" disabled forceMount>
                    <Users aria-hidden />
                    {t("palette.tradersHint")}
                  </CommandItem>
                ) : null}
                {traders.map((trader) => (
                  <CommandItem
                    key={trader.id}
                    value={`trader-${trader.id}`}
                    // The server matched name or phone: always show it.
                    keywords={[search]}
                    onSelect={() => go(traderHref(trader.id))}
                  >
                    <Users aria-hidden />
                    <span dir="auto" className="truncate">
                      {trader.name}
                    </span>
                    <span className="text-muted-foreground ms-auto text-xs">
                      {tt(`types.${trader.type}`)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
