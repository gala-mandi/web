"use client";

import { useTranslations } from "next-intl";
import { Wheat } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { User } from "@/features/auth/types";
import { isActivePath } from "@/lib/routes";
import { landingItemFor, menuFor } from "../menu";

/**
 * Permission-based main menu. Collapses to icons on desktop and opens as a
 * drawer (Sheet) on mobile, where picking a page closes it. Every item is a
 * plain link, so Tab / Shift+Tab and Enter work as everywhere else.
 */
export function AppSidebar({
  user,
}: {
  user: Pick<User, "permissions"> | null;
}) {
  const t = useTranslations("panel");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const items = menuFor(user, t);
  const home = landingItemFor(user, t);
  const closeDrawer = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={t("appName")}
              className="focus-visible:ring-sidebar-ring"
            >
              <Link
                href={home.href}
                aria-label={t("homeLabel", { page: home.label })}
                onClick={closeDrawer}
              >
                <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Wheat aria-hidden className="size-[18px]" />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="font-heading truncate text-[15px] font-extrabold">
                    {t("appName")}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {t("appSubtitle")}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label={t("menuLabel")}>
              <SidebarMenu className="gap-1">
                {items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className="h-9 font-semibold"
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={closeDrawer}
                        >
                          <Icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
