import { Check, Lock, PauseCircle } from "lucide-react";
import { blockedText } from "../text";
import { AuthCard, TextLink, UrduLine } from "./auth-ui";

/** 4.1 Shop suspended (login or refresh answered 403 `TENANT_SUSPENDED`). */
export function ShopSuspended({
  shopName = null,
}: {
  shopName?: string | null;
}) {
  const t = blockedText.shopSuspended;
  return (
    <AuthCard className="max-w-[440px] gap-[18px] p-6 sm:p-9">
      <div className="bg-notice-soft text-notice flex size-[60px] items-center justify-center rounded-[18px] border border-orange-200">
        <PauseCircle aria-hidden className="size-7" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-notice self-start rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold">
          {t.badge}
        </span>
        <h2 className="font-heading text-[26px] font-extrabold tracking-tight">
          {t.title(shopName)}
        </h2>
        <p className="text-muted-foreground text-[14.5px]/relaxed">{t.body}</p>
        <UrduLine>{t.ur}</UrduLine>
      </div>
      <ul className="bg-background text-foreground/85 flex flex-col gap-2.5 rounded-[14px] px-4 py-3.5 text-[13.5px]">
        {t.points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <Check
              aria-hidden
              className="text-success mt-0.5 size-4 flex-none"
            />
            {point}
          </li>
        ))}
      </ul>
      <p className="text-foreground text-sm font-semibold">{t.contact}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TextLink href="/login">{t.anotherAccount}</TextLink>
        <span className="text-muted-foreground text-[13px]">{t.staff}</span>
      </div>
    </AuthCard>
  );
}

/** 4.2 Account disabled (403 `ACCOUNT_DISABLED`). */
export function AccountDisabled() {
  const t = blockedText.accountDisabled;
  return (
    <AuthCard className="items-center gap-[18px] p-6 text-center sm:p-9">
      <div className="relative size-[84px]">
        <div className="bg-surface-muted text-foreground/70 flex size-[84px] items-center justify-center rounded-full">
          <Lock aria-hidden className="size-8" />
        </div>
        <div className="bg-destructive border-card absolute -end-0.5 -bottom-0.5 flex size-8 items-center justify-center rounded-full border-4">
          <span aria-hidden className="h-0.5 w-3 rounded bg-white" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-[26px] font-extrabold tracking-tight">
          {t.title}
        </h2>
        <p className="text-muted-foreground text-[14.5px]/relaxed">{t.body}</p>
        <UrduLine>{t.ur}</UrduLine>
      </div>
      <div className="bg-background text-foreground/85 w-full rounded-xl px-3.5 py-3 text-start text-[13px]/normal">
        {t.hint} <strong className="text-foreground">{t.hintPath}</strong>.
      </div>
      <TextLink href="/login">{t.back}</TextLink>
    </AuthCard>
  );
}
