"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useShopInfo } from "../hooks";
import { panelText } from "../text";
import { ShopLogo } from "./shop-logo";

/** Shop logo + name in the header, live from the `/auth/me` query. */
export function ShopIdentity() {
  const { shop, isLoading } = useShopInfo();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5" aria-hidden>
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-4 w-28" />
      </div>
    );
  }

  const name = shop?.name ?? panelText.shopFallback;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <ShopLogo name={name} logoUrl={shop?.logoUrl ?? null} />
      <span
        className="font-heading truncate text-[15px] font-extrabold"
        data-testid="shop-name"
      >
        {name}
      </span>
    </div>
  );
}
