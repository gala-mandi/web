"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/features/auth/types";
import { cn } from "@/lib/utils";
import { menuFor } from "../menu";
import { panelText } from "../text";

/**
 * Role-based menu. Items whose page doesn't exist yet are shown, but not as
 * links (marked "Soon"), so each role already sees its real menu.
 */
export function SideMenu({ role }: { role: Role | null }) {
  const pathname = usePathname();
  const items = menuFor(role);

  return (
    <nav aria-label={panelText.menuLabel}>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map((item) => {
          const base =
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap";
          if (!item.href) {
            return (
              <li key={item.key}>
                <span
                  aria-disabled="true"
                  className={cn(
                    base,
                    "text-muted-foreground/80 cursor-not-allowed",
                  )}
                >
                  <span aria-hidden className="bg-border size-2 rounded-full" />
                  {item.label}
                  <span className="bg-muted text-muted-foreground ms-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                    {panelText.soon}
                  </span>
                </span>
              </li>
            );
          }
          const active = pathname === item.href;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  base,
                  "focus-visible:ring-ring/15 outline-none focus-visible:ring-4",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 rounded-full",
                    active ? "bg-primary" : "bg-border",
                  )}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
