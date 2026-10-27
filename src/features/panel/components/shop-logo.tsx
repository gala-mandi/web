"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * The shop's logo, or its initials when it has none (or the image fails).
 * Decorative: the shop name is always shown next to it.
 */
export function ShopLogo({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl: string | null;
  className?: string;
}) {
  // Keyed by URL, so a new logo is tried again after a failed one.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = logoUrl !== null && failedUrl !== logoUrl;

  return (
    <span
      aria-hidden
      className={cn(
        "bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold",
        className,
      )}
    >
      {showImage ? (
        // A logo uploaded by the shop, hosted by the API: any host, any size,
        // so next/image (which needs fixed remote patterns) isn't used here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          data-testid="shop-logo"
          className="bg-card size-full object-contain"
          onError={() => setFailedUrl(logoUrl)}
        />
      ) : (
        <span data-testid="shop-initials">{initials(name)}</span>
      )}
    </span>
  );
}
