"use client";

import { ArrowLeft, CircleAlert, Pencil, ReceiptText } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirePermission } from "@/features/panel/components/require-permission";
import {
  ForbiddenState,
  NotFoundState,
} from "@/features/panel/components/status-pages";
import { toApiError } from "@/lib/api-error";
import { useCan } from "@/lib/can";
import { formatDate, formatRs } from "@/lib/format";
import { traderRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { readBalance } from "../balance";
import { useTrader } from "../hooks";
import { balanceTypeText, traderText, traderTypeText } from "../text";
import type { TraderDetail } from "../types";
import { TraderStatusBadge, TraderTypeBadge } from "./badges";
import { TraderFormSheet } from "./trader-form-sheet";
import { TraderName } from "./trader-name";

const t = traderText.profile;

/** `/traders/:id`: details, current balance and (later) recent entries. */
export function TraderProfile({ id }: { id: string }) {
  return (
    <RequirePermission permission="trader.manage">
      <ProfileContent id={id} />
    </RequirePermission>
  );
}

function ProfileContent({ id }: { id: string }) {
  const query = useTrader(id);

  if (query.isPending) return <ProfileSkeleton />;
  if (query.isError) {
    const { status } = toApiError(query.error);
    // 400: not a trader id at all.
    if (status === 404 || status === 400) return <NotFoundState />;
    if (status === 403) return <ForbiddenState />;
    return (
      <EmptyState
        role="alert"
        icon={CircleAlert}
        title={t.error.title}
        body={t.error.body}
        headingLevel="h1"
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t.error.retry}
          </Button>
        }
      />
    );
  }
  return <Profile trader={query.data} />;
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <span role="status" className="sr-only">
        {t.loading}
      </span>
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="rounded-card h-72" />
        <Skeleton className="rounded-card h-40" />
      </div>
    </div>
  );
}

function Profile({ trader }: { trader: TraderDetail }) {
  const canManage = useCan("trader.manage");
  const [editing, setEditing] = useState(false);
  const f = t.fields;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={traderRoutes.list}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold outline-none focus-visible:ring-3"
      >
        <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />
        {t.back}
      </Link>

      <PageHeader
        title={<TraderName name={trader.name} />}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <TraderTypeBadge type={trader.type} />
            <TraderStatusBadge active={trader.isActive} />
            {trader.fatherName ? (
              <span>
                {traderText.fatherPrefix}{" "}
                <TraderName name={trader.fatherName} />
              </span>
            ) : null}
          </span>
        }
        actions={
          canManage ? (
            <Button
              size="lg"
              variant="outline"
              className="h-10 gap-2 px-4 font-semibold"
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden />
              {t.edit}
            </Button>
          ) : null
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          aria-labelledby="trader-details-title"
          className="rounded-card bg-card flex flex-col gap-4 border p-5 sm:p-6"
        >
          <h2
            id="trader-details-title"
            className="font-heading text-lg font-bold"
          >
            {t.details}
          </h2>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label={f.type}>{traderTypeText[trader.type]}</Detail>
            <Detail label={f.status}>
              {trader.isActive ? traderText.active : traderText.inactive}
            </Detail>
            <Detail label={f.fatherName}>
              {trader.fatherName ? (
                <TraderName name={trader.fatherName} />
              ) : null}
            </Detail>
            <Detail label={f.phone}>
              {trader.phone ? (
                <span dir="ltr" className="tabular-nums">
                  {trader.phone}
                </span>
              ) : null}
            </Detail>
            <Detail label={f.cnic}>
              {trader.cnic ? (
                <span dir="ltr" className="tabular-nums">
                  {trader.cnic}
                </span>
              ) : null}
            </Detail>
            <Detail label={f.village}>
              {trader.village ? <TraderName name={trader.village} /> : null}
            </Detail>
            <Detail label={f.address} wide>
              {trader.address ? (
                <span dir="auto" className="whitespace-pre-line">
                  {trader.address}
                </span>
              ) : null}
            </Detail>
            <Detail label={f.openingBalance}>
              <span dir="ltr" className="tabular-nums">
                {formatRs(trader.openingBalance)}
              </span>{" "}
              <span className="text-muted-foreground text-sm">
                {balanceTypeText[trader.openingBalanceType]}
              </span>
            </Detail>
            <Detail label={f.creditLimit}>
              {trader.creditLimit ? (
                <span dir="ltr" className="tabular-nums">
                  {formatRs(trader.creditLimit)}
                </span>
              ) : (
                t.noLimit
              )}
            </Detail>
            <Detail label={f.added}>{formatDate(trader.createdAt)}</Detail>
            <Detail label={f.notes} wide>
              {trader.notes ? (
                <span dir="auto" className="whitespace-pre-line">
                  {trader.notes}
                </span>
              ) : null}
            </Detail>
          </dl>
        </section>

        <BalanceCard trader={trader} />
      </div>

      <section
        aria-labelledby="trader-transactions-title"
        className="flex flex-col gap-3"
      >
        <h2
          id="trader-transactions-title"
          className="font-heading text-lg font-bold"
        >
          {t.transactions.title}
        </h2>
        <EmptyState
          icon={ReceiptText}
          title={t.transactions.emptyTitle}
          body={t.transactions.emptyBody}
          headingLevel="h2"
        />
      </section>

      {canManage ? (
        <TraderFormSheet
          open={editing}
          onOpenChange={setEditing}
          trader={trader}
        />
      ) : null}
    </div>
  );
}

function Detail({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-0.5", wide && "sm:col-span-2")}
    >
      <dt className="text-muted-foreground text-[13px] font-semibold">
        {label}
      </dt>
      <dd className="break-words">
        {children ?? (
          <span className="text-muted-foreground">{traderText.none}</span>
        )}
      </dd>
    </div>
  );
}

const balanceTone = {
  receivable: "text-success",
  payable: "text-destructive",
  settled: "text-muted-foreground",
} as const;

/** Positive = Receivable (trader owes the shop), negative = Payable. */
function BalanceCard({ trader }: { trader: TraderDetail }) {
  const { kind, amount } = readBalance(trader.balance);
  const b = t.balance;
  const hint =
    kind === "receivable"
      ? b.receivableHint(trader.name)
      : kind === "payable"
        ? b.payableHint(trader.name)
        : b.settledHint;

  return (
    <section
      aria-labelledby="trader-balance-title"
      className="rounded-card bg-card flex flex-col gap-2 border p-5 sm:p-6"
    >
      <h2
        id="trader-balance-title"
        className="text-muted-foreground text-sm font-semibold"
      >
        {b.title}
      </h2>
      <p
        data-testid="trader-balance"
        className="font-heading text-3xl font-extrabold tabular-nums"
        dir="ltr"
      >
        {formatRs(amount)}
      </p>
      <p
        data-kind={kind}
        className={cn(
          "text-sm font-bold uppercase tracking-wide",
          balanceTone[kind],
        )}
      >
        {b[kind]}
      </p>
      <p className="text-muted-foreground text-sm">
        <bdi dir="auto">{hint}</bdi>
      </p>
    </section>
  );
}
