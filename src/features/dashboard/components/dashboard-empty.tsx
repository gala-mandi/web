"use client";

import { ArrowRight, LayoutDashboard, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCanWrite } from "@/features/subscription/hooks";
import type { Permission } from "@/lib/can";

export interface EmptyStep {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** The step is only listed for users the server gave this permission. */
  permission: Permission;
}

export interface DashboardEmptyProps {
  title: string;
  body: string;
  stepsLabel: string;
  steps: EmptyStep[];
}

/**
 * The helpful empty state of a shop with no data yet: what the dashboard
 * will show and links to the first things to enter, for this user's role.
 */
export function DashboardEmpty({
  title,
  body,
  stepsLabel,
  steps,
}: DashboardEmptyProps) {
  return (
    <section
      role="status"
      aria-labelledby="dash-empty-title"
      data-testid="dashboard-empty"
      className="bg-card text-card-foreground rounded-card relative isolate flex flex-col items-center gap-4 overflow-hidden border px-6 py-12 text-center"
    >
      <span
        aria-hidden
        className="bg-chart-1/10 pointer-events-none absolute -top-24 -z-10 size-72 rounded-full blur-3xl"
      />
      <div className="bg-primary text-primary-foreground shadow-button flex size-14 items-center justify-center rounded-2xl">
        <LayoutDashboard aria-hidden className="size-6" />
      </div>
      <h2 id="dash-empty-title" className="font-heading text-xl font-bold">
        {title}
      </h2>
      <p className="text-muted-foreground max-w-lg text-sm/relaxed">{body}</p>
      <nav aria-label={stepsLabel} className="mt-2 w-full max-w-md">
        <ul className="flex flex-col gap-2">
          {steps.map((step) => (
            <Step key={step.key} step={step} />
          ))}
        </ul>
      </nav>
    </section>
  );
}

function Step({ step }: { step: EmptyStep }) {
  const allowed = useCanWrite(step.permission);
  if (!allowed) return null;
  const Icon = step.icon;
  return (
    <li>
      <Link
        href={step.href}
        className="hover:border-primary/40 hover:bg-accent focus-visible:ring-ring/50 group flex items-center gap-3 rounded-xl border px-4 py-3 text-start text-sm font-semibold outline-none transition-colors focus-visible:ring-[3px]"
      >
        <span
          aria-hidden
          className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg"
        >
          <Icon className="size-4" />
        </span>
        {step.label}
        <ArrowRight
          aria-hidden
          className="text-muted-foreground ms-auto size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        />
      </Link>
    </li>
  );
}
