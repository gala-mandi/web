"use client";

import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import type { User } from "@/features/auth/types";
import { panelText } from "../text";
import { PaletteButton } from "./command-palette";
import { PanelBreadcrumbs } from "./panel-breadcrumbs";
import { ShopIdentity } from "./shop-identity";
import { UserMenu } from "./user-menu";

/** Top bar: menu toggle, shop logo + name, breadcrumbs, search, user menu. */
export function PanelHeader({ user }: { user: User | null }) {
  const { toggleSidebar, isMobile, open, openMobile } = useSidebar();

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b px-3 backdrop-blur sm:px-5">
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={panelText.toggleSidebar}
        aria-expanded={isMobile ? openMobile : open}
        onClick={toggleSidebar}
        className="aria-expanded:hover:bg-muted aria-expanded:bg-transparent"
      >
        <PanelLeft aria-hidden className="rtl:rotate-180" />
      </Button>
      <ShopIdentity />
      <Separator
        orientation="vertical"
        className="mx-1 hidden data-vertical:h-5 data-vertical:self-center lg:block"
      />
      <PanelBreadcrumbs user={user} className="hidden min-w-0 lg:block" />
      <div className="ms-auto flex shrink-0 items-center gap-1.5">
        <PaletteButton />
        {user ? <UserMenu user={user} /> : null}
      </div>
    </header>
  );
}
