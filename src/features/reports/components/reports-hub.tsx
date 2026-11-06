"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  HandCoins,
  type LucideIcon,
  Scale,
  ShoppingBasket,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  tileTones,
  type TileTone,
} from "@/features/dashboard/components/kpi-tile";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { reportRoutes, type ReportSlug, reportSlugs } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { reportText } from "../text";

const t = reportText;

const look: Record<ReportSlug, { icon: LucideIcon; tone: TileTone }> = {
  "daily-summary": { icon: CalendarDays, tone: "primary" },
  purchases: { icon: ShoppingBasket, tone: "orange" },
  sales: { icon: Truck, tone: "green" },
  commission: { icon: HandCoins, tone: "violet" },
  outstanding: { icon: Scale, tone: "orange" },
  "cash-book": { icon: BookOpenCheck, tone: "green" },
};

/** `/reports`: one card per report, for `report.view`. */
export function ReportsHub() {
  return (
    <RequirePermission permission="report.view">
      <div className="flex flex-col gap-6">
        <PageHeader title={t.hub.title} description={t.hub.description} />
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reportSlugs.map((slug) => {
            const { icon: Icon, tone } = look[slug];
            const report = t.reports[slug];
            return (
              <li key={slug}>
                <Card className="rounded-card group relative isolate h-full gap-3 overflow-hidden p-5 shadow-[0_1px_2px_rgb(30_27_46/0.04),0_8px_24px_-12px_rgb(76_29_149/0.14)] transition-[transform,box-shadow] duration-200 focus-within:ring-3 focus-within:ring-ring/50 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:shadow-none">
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute -end-10 -top-10 -z-10 size-32 rounded-full blur-2xl",
                      tileTones[tone].glow,
                    )}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      tileTones[tone].chip,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h2 className="font-heading text-lg font-bold">
                    <Link
                      href={reportRoutes.report(slug)}
                      aria-label={t.hub.open(report.title)}
                      className="outline-none after:absolute after:inset-0 after:content-['']"
                    >
                      {report.title}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground text-sm/relaxed">
                    {report.description}
                  </p>
                  <ArrowRight
                    aria-hidden
                    className="text-muted-foreground group-hover:text-primary mt-auto size-5 transition-colors rtl:rotate-180"
                  />
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </RequirePermission>
  );
}
