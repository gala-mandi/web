"use client";

import { Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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
import { hasPermission } from "@/lib/can";
import { useUiStore } from "@/stores/ui";
import { menuFor } from "../menu";
import { panelText } from "../text";

const t = panelText.palette;

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
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  return (
    <Button
      variant="outline"
      onClick={() => setOpen(true)}
      aria-keyshortcuts="Control+K Meta+K"
      className="text-muted-foreground h-10 gap-2 rounded-xl px-2.5 sm:w-56 sm:justify-start sm:px-3"
    >
      <Search aria-hidden />
      <span className="sr-only sm:not-sr-only">{t.open}</span>
      <kbd
        aria-hidden
        className="bg-muted text-muted-foreground ms-auto hidden rounded-md px-1.5 py-0.5 font-sans text-[11px] font-semibold sm:inline"
      >
        {t.shortcut}
      </kbd>
    </Button>
  );
}

/**
 * Ctrl+K quick search: lists the pages the user may open (same gating as the
 * menu) and goes there on Enter. Arrow keys move, Esc closes and returns
 * focus. Searching traders needs the traders API, so for now it only says so.
 */
export function CommandPalette({
  user,
}: {
  user: Pick<User, "permissions"> | null;
}) {
  const router = useRouter();
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const pages = menuFor(user);
  const showTraders = hasPermission(user, "trader.view");
  const returnFocus = useRef<HTMLElement | null>(null);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder={t.placeholder} aria-label={t.title} />
          <CommandList>
            <CommandEmpty>{t.empty}</CommandEmpty>
            <CommandGroup heading={t.pages}>
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
            {showTraders ? (
              <CommandGroup heading={t.traders} forceMount>
                <CommandItem value="traders-search" disabled forceMount>
                  <Users aria-hidden />
                  {t.tradersSoon}
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
