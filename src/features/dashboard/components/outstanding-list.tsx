"use client";

import { bidi } from "@/i18n/bidi";
import { useTranslations } from "next-intl";
import { TraderName } from "@/features/traders/components/trader-name";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TraderTypeBadge } from "@/features/traders/components/badges";
import { useCan } from "@/lib/can";
import { useFormat } from "@/lib/use-format";
import { ledgerRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { barShare } from "../series";
import type { OutstandingSide } from "../types";
import {
  MoneyFigure,
  panelClass,
  SectionEmpty,
  SectionError,
} from "./chart-parts";

/**
 * Receivable is green and payable red everywhere, as in the ledger; the
 * title and the "Total receivable/payable" words always go with the colour.
 */
const tone = {
  receivable: { bar: "bg-success", text: "text-success" },
  payable: { bar: "bg-destructive", text: "text-destructive" },
} as const;

export type OutstandingKind = keyof typeof tone;

export interface OutstandingListProps {
  kind: OutstandingKind;
  side: OutstandingSide | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  className?: string;
}

/**
 * The largest khata balances on one side, as rounded bars sized against the
 * largest one. `total` and `count` are the server's and cover every trader.
 */
export function OutstandingList({
  kind,
  side,
  isPending,
  isError,
  onRetry,
  className,
}: OutstandingListProps) {
  const { formatRs } = useFormat();
  const t = useTranslations("dashboard");
  const titleId = `dash-${kind}-title`;
  const canOpenKhata = useCan("ledger.view");
  const largest = side?.traders[0]?.amount ?? "0";

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className={cn(panelClass, className)}
      data-testid={`outstanding-${kind}`}
    >
      <CardHeader className="px-5">
        <CardTitle id={titleId} className="font-heading text-lg">
          {t(`outstanding.${kind}.title`)}
        </CardTitle>
        <CardDescription>
          {t(`outstanding.${kind}.description`)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5">
        {isError && !side ? (
          <SectionError message={t("outstanding.error")} onRetry={onRetry} />
        ) : isPending || !side ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="bg-surface-muted/60 flex flex-wrap items-end justify-between gap-2 rounded-xl px-4 py-3">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs font-semibold">
                  {t(`outstanding.${kind}.total`)}
                </span>
                <MoneyFigure
                  value={side.total}
                  className={cn(
                    "font-heading text-xl font-extrabold",
                    tone[kind].text,
                  )}
                />
              </div>
              {side.count > 0 ? (
                <span className="text-muted-foreground text-xs">
                  {t("outstanding.shown", {
                    shown: side.traders.length,
                    count: t("traders", { n: side.count }),
                  })}
                </span>
              ) : null}
            </div>
            {side.traders.length === 0 ? (
              <SectionEmpty className="py-6">
                {t(`outstanding.${kind}.empty`)}
              </SectionEmpty>
            ) : (
              <ol className="flex flex-col gap-3">
                {side.traders.map((trader, i) => (
                  <li
                    key={trader.traderId}
                    data-trader={trader.traderId}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        aria-hidden
                        className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums"
                      >
                        {i + 1}
                      </span>
                      {canOpenKhata ? (
                        <Link
                          href={ledgerRoutes.khata(trader.traderId)}
                          aria-label={t("outstanding.openKhata", {
                            name: bidi(trader.name),
                          })}
                          className="hover:text-primary focus-visible:ring-ring/50 min-w-0 truncate rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
                        >
                          <TraderName name={trader.name} />
                        </Link>
                      ) : (
                        <span className="min-w-0 truncate font-medium">
                          <TraderName name={trader.name} />
                        </span>
                      )}
                      {/* On a phone the name gets the room; the khata shows the type. */}
                      <span className="hidden shrink-0 sm:inline-flex">
                        <TraderTypeBadge type={trader.type} />
                      </span>
                      <span className="ms-auto shrink-0 font-semibold tabular-nums">
                        {formatRs(trader.amount)}
                      </span>
                    </div>
                    <div
                      aria-hidden
                      className="bg-muted ms-7 h-1.5 overflow-hidden rounded-full"
                    >
                      <div
                        className={cn(
                          "h-full animate-[dash-grow_0.8s_ease-out] rounded-full motion-reduce:animate-none",
                          tone[kind].bar,
                        )}
                        style={{
                          inlineSize: `${Math.max(2, barShare(trader.amount, largest) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
