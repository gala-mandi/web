"use client";

import { bidi } from "@/i18n/bidi";
import { Check, PauseCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuthCard, SubLine } from "@/features/auth/components/auth-ui";
import { useFormat } from "@/lib/use-format";
import { useSessionStore } from "@/stores/session";
import { useSubscription } from "../hooks";

const points = ["view", "paused", "unlock"] as const;

/**
 * Screen 4.1 ("Shop suspended") as it appears inside the panel when a
 * read-only shop opens a page that creates or changes something (new
 * purchase, edit sale…). Viewing and printing pages keep working.
 */
export function ReadOnlyNotice() {
  const t = useTranslations("subscription.notice");
  const { formatDate } = useFormat();
  const query = useSubscription();
  const user = useSessionStore((s) => s.user);
  const endsOn = query.data?.subscription?.endsOn;
  return (
    <div className="flex justify-center py-4 sm:py-10">
      <AuthCard
        data-testid="read-only-notice"
        className="max-w-[460px] gap-[18px] p-6 sm:p-9"
      >
        <div className="bg-notice-soft text-notice flex size-[60px] items-center justify-center rounded-[18px] border border-orange-200">
          <PauseCircle aria-hidden className="size-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-notice self-start rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold">
            {t("badge")}
          </span>
          <h1 className="font-heading text-[26px] font-extrabold tracking-tight">
            {user?.tenant?.name
              ? t("title", { shop: bidi(user.tenant.name) })
              : t("titleNoShop")}
          </h1>
          <p className="text-muted-foreground text-[14.5px]/relaxed">
            {t("body", { endsOn: endsOn ? formatDate(endsOn) : "—" })}
          </p>
          <SubLine>{t("subline")}</SubLine>
        </div>
        <ul className="bg-background text-foreground/85 flex flex-col gap-2.5 rounded-[14px] px-4 py-3.5 text-[13.5px]">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5">
              <Check
                aria-hidden
                className="text-success mt-0.5 size-4 flex-none"
              />
              {t(`points.${point}`)}
            </li>
          ))}
        </ul>
        <p className="text-foreground text-sm font-semibold">
          {user?.role === "owner" ? t("contact") : t("staff")}
        </p>
      </AuthCard>
    </div>
  );
}
