"use client";

import { CalendarClock, Lock, Sparkles, TriangleAlert, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session";
import {
  type BannerKind,
  bannerFor,
  hiddenOn,
  hideFor,
  subscribeHidden,
} from "../banner";
import { useSubscription } from "../hooks";
import { subscriptionText } from "../text";
import type { ShopSubscription } from "../types";

const t = subscriptionText.banner;

const tone: Record<BannerKind, string> = {
  trial: "bg-secondary text-secondary-foreground border-primary/15",
  expiring: "bg-warning-soft text-warning border-warning/25",
  grace: "bg-notice-soft text-notice border-notice/25",
  read_only: "bg-destructive-soft text-destructive border-destructive-border",
};

const icons = {
  trial: Sparkles,
  expiring: CalendarClock,
  grace: TriangleAlert,
  read_only: Lock,
} satisfies Record<BannerKind, unknown>;

function message(kind: BannerKind, shop: ShopSubscription): string {
  const sub = shop.subscription;
  if (kind === "read_only")
    return t.readOnly(sub ? formatDate(sub.endsOn) : "—");
  if (!sub) return "";
  const endsOn = formatDate(sub.endsOn);
  if (kind === "grace") {
    return t.grace(endsOn, sub.graceDaysLeft, formatDate(sub.graceEndsOn));
  }
  if (kind === "trial") return t.trial(sub.daysLeft, endsOn);
  return t.expiring(sub.plan.name, sub.daysLeft, endsOn);
}

/**
 * Plan banner on top of every panel page: trial days left, a paid plan
 * ending within 7 days, the grace period and read-only mode. Trial and
 * "ending soon" can be hidden until the next (Pakistan) day.
 */
export function SubscriptionBanner() {
  const query = useSubscription();
  const isOwner = useSessionStore((s) => s.user?.role === "owner");
  // Server HTML has no storage (null), so it matches the first client pass.
  const hidden = useSyncExternalStore(subscribeHidden, hiddenOn, () => null);

  const shop = query.data;
  const banner = bannerFor(shop);
  if (!shop || !banner) return null;
  if (banner.dismissible && hidden === shop.today) return null;

  const Icon = icons[banner.kind];
  const urgent = banner.kind === "grace" || banner.kind === "read_only";

  return (
    <section
      aria-label={t.label}
      role={urgent ? "alert" : "status"}
      data-testid="subscription-banner"
      data-kind={banner.kind}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm sm:items-center",
        tone[banner.kind],
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-[18px] flex-none sm:mt-0" />
      <p className="flex-1 leading-relaxed">
        <span className="font-semibold">{message(banner.kind, shop)}</span>{" "}
        {urgent || banner.kind === "expiring" ? (
          <span className="opacity-90">
            {isOwner ? t.renewOwner : t.renewStaff}
          </span>
        ) : null}
      </p>
      {banner.dismissible ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-me-1 flex-none text-current hover:bg-black/5"
          aria-label={t.dismiss}
          title={t.dismiss}
          onClick={() => {
            hideFor(shop.today);
          }}
        >
          <X aria-hidden />
        </Button>
      ) : null}
    </section>
  );
}
