"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  HandCoins,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DataTable,
  DataTableDateRangeFilter,
  parseAsDay,
  useDataTableState,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { toApiError } from "@/lib/api-error";
import { useCan } from "@/lib/can";
import { formatDate, formatRs, karachiToday } from "@/lib/format";
import { paymentRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useCashBook, usePayments } from "../hooks";
import { paymentText } from "../text";
import {
  type CashBook,
  type PaymentListQuery,
  paymentSortFields,
  type PaymentSummary,
} from "../types";
import { cashVoucherColumns } from "./cash-voucher-columns";

const t = paymentText.cashBook;

/** `?from=&to=` (default today); module scope, the hook needs it stable. */
const cashBookFilters = { from: parseAsDay, to: parseAsDay };

const getRowId = (row: PaymentSummary) => row.id;
const getRowLabel = (row: PaymentSummary) => row.voucherNo;

/** `YYYY-MM-DD` ± days (calendar maths on a date, not money). */
function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** `/payments`: the cash book, for everyone with `payment.view`. */
export function CashBookPage() {
  return (
    <RequirePermission permission="payment.view">
      <CashBookView />
    </RequirePermission>
  );
}

/**
 * The cash book by date: opening cash, cash received and paid each day and
 * the cash that should be in hand at the close (the server's numbers, only
 * formatted), then the cash vouchers behind them. One day by default
 * (today) with previous / next day; any range from the dates filter.
 */
function CashBookView() {
  const router = useRouter();
  const [today] = useState(() => karachiToday());
  const canCreate = useCan("payment.create");
  const list = useDataTableState({
    filters: cashBookFilters,
    sortFields: paymentSortFields,
    defaultSort: "paymentDate",
    pageSize: 50,
  });
  const to = list.filters.to ?? today;
  const from = list.filters.from ?? to;
  const oneDay = from === to;

  const book = useCashBook({ from, to });
  const vouchersQuery: PaymentListQuery = {
    page: list.listParams.page,
    limit: list.listParams.limit,
    sort: list.listParams.sort,
    from,
    to,
    method: "cash",
    status: "posted",
  };
  const vouchers = usePayments(vouchersQuery);
  const columns = useMemo(() => cashVoucherColumns(), []);

  const status = book.isError ? toApiError(book.error).status : null;
  if (status === 403) return <ForbiddenState />;

  const showDay = (day: string) => list.setFilters({ from: day, to: day });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          canCreate ? (
            <>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-10 gap-2 px-4 font-semibold"
              >
                <Link href={paymentRoutes.new("received")}>
                  <ArrowDownLeft aria-hidden />
                  {t.receiveButton}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="h-10 gap-2 px-4 font-semibold"
              >
                <Link href={paymentRoutes.new("paid")}>
                  <ArrowUpRight aria-hidden />
                  {t.payButton}
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      <div className="flex flex-wrap items-end gap-2">
        <DataTableDateRangeFilter
          label={t.datesLabel}
          value={{ from, to }}
          onChange={(range) =>
            list.setFilters({ from: range.from, to: range.to })
          }
          className="sm:w-64"
        />
        {oneDay ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10"
              aria-label={t.previousDay}
              onClick={() => showDay(shiftDay(from, -1))}
            >
              <ChevronLeft aria-hidden className="rtl:rotate-180" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10"
              aria-label={t.nextDay}
              disabled={to >= today}
              onClick={() => showDay(shiftDay(from, 1))}
            >
              <ChevronRight aria-hidden className="rtl:rotate-180" />
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="h-10 font-semibold"
          disabled={from === today && to === today}
          onClick={() => list.setFilters({ from: null, to: null })}
        >
          {t.today}
        </Button>
      </div>

      {book.isPending ? (
        <CashBookSkeleton />
      ) : book.isError ? (
        <EmptyState
          role="alert"
          icon={CircleAlert}
          title={t.error.title}
          body={t.error.body}
          action={
            <Button variant="outline" onClick={() => void book.refetch()}>
              {t.error.retry}
            </Button>
          }
        />
      ) : (
        <div
          className={cn(
            "flex flex-col gap-6 transition-opacity",
            book.isPlaceholderData && "opacity-60",
          )}
          aria-busy={book.isPlaceholderData || undefined}
        >
          <Totals book={book.data} />
          <DaysTable book={book.data} />
        </div>
      )}

      <section
        aria-labelledby="cash-vouchers-title"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-0.5">
          <h2
            id="cash-vouchers-title"
            className="font-heading text-lg font-bold"
          >
            {t.vouchers.title}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t.vouchers.description}
          </p>
        </div>
        <DataTable
          caption={t.vouchers.caption}
          columns={columns}
          data={vouchers.data?.data}
          getRowId={getRowId}
          getRowLabel={getRowLabel}
          rowCount={vouchers.data?.meta.total ?? 0}
          pagination={list.pagination}
          onPaginationChange={list.onPaginationChange}
          sorting={list.sorting}
          onSortingChange={list.onSortingChange}
          isLoading={vouchers.isPending}
          isFetching={vouchers.isPlaceholderData}
          isError={vouchers.isError}
          onRetry={() => void vouchers.refetch()}
          onRowClick={(row) => router.push(paymentRoutes.detail(row.id))}
          empty={
            <EmptyState
              icon={HandCoins}
              title={t.vouchers.empty.title}
              body={t.vouchers.empty.body}
              className="rounded-none border-0"
            />
          }
        />
      </section>

      <p className="text-muted-foreground text-xs">{t.note}</p>
    </div>
  );
}

function CashBookSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <span role="status" className="sr-only">
        {t.loading}
      </span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="rounded-card h-28" />
        ))}
      </div>
      <Skeleton className="rounded-card h-40" />
    </div>
  );
}

/** Opening, in, out and the cash that should be in hand. */
function Totals({ book }: { book: CashBook }) {
  const closingDay = formatDate(book.to);
  return (
    <dl
      data-testid="cash-book-totals"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <Stat
        label={t.opening}
        hint={t.openingHint}
        value={book.openingCash}
        testId="cash-opening"
      />
      <Stat
        label={t.cashIn}
        hint={t.cashInHint}
        value={book.totals.cashIn}
        icon={ArrowDownLeft}
        tone="text-success"
        sign="+"
        testId="cash-in"
      />
      <Stat
        label={t.cashOut}
        hint={t.cashOutHint}
        value={book.totals.cashOut}
        icon={ArrowUpRight}
        tone="text-warning"
        sign="−"
        testId="cash-out"
      />
      <Stat
        label={t.closing}
        hint={t.closingHint(closingDay)}
        value={book.closingCash}
        icon={Wallet}
        highlight
        testId="cash-closing"
      />
    </dl>
  );
}

function Stat({
  label,
  hint,
  value,
  icon: Icon,
  tone,
  sign,
  highlight = false,
  testId,
}: {
  label: string;
  hint: string;
  value: string;
  icon?: typeof Wallet;
  tone?: string;
  sign?: string;
  highlight?: boolean;
  testId: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card flex flex-col gap-1 border p-4 sm:p-5",
        highlight
          ? "border-transparent bg-gradient-to-br from-[var(--color-brand-from)] to-[var(--color-brand-to)] text-white shadow-[0_18px_40px_-22px_var(--color-brand-from)]"
          : "bg-card",
      )}
    >
      <dt
        className={cn(
          "flex items-center gap-1.5 text-[13px] font-semibold",
          highlight ? "text-white/85" : "text-muted-foreground",
        )}
      >
        {Icon ? (
          <Icon aria-hidden className={cn("size-4", highlight ? "" : tone)} />
        ) : null}
        {label}
      </dt>
      <dd
        dir="ltr"
        data-testid={testId}
        className="font-heading text-2xl font-extrabold tabular-nums sm:text-[1.65rem]"
      >
        {sign && /[1-9]/.test(value) ? (
          <span aria-hidden className={cn("me-0.5", tone)}>
            {sign}
          </span>
        ) : null}
        {formatRs(value)}
      </dd>
      <dd
        className={cn(
          "text-xs",
          highlight ? "text-white/80" : "text-muted-foreground",
        )}
      >
        {hint}
      </dd>
    </div>
  );
}

/** One row per day with cash: opening (the day before's closing), in, out, closing. */
function DaysTable({ book }: { book: CashBook }) {
  const c = t.days;
  return (
    <div className="rounded-card bg-card overflow-x-auto border">
      <table
        data-testid="cash-book-days"
        className="w-full min-w-[36rem] border-collapse text-sm"
      >
        <caption className="sr-only">{c.caption}</caption>
        <thead className="bg-surface-muted text-muted-foreground text-xs tracking-wide uppercase">
          <tr>
            <th scope="col" className="px-4 py-2.5 text-start font-semibold">
              {c.date}
            </th>
            <th scope="col" className="px-3 py-2.5 text-end font-semibold">
              {c.opening}
            </th>
            <th scope="col" className="px-3 py-2.5 text-end font-semibold">
              {c.cashIn}
            </th>
            <th scope="col" className="px-3 py-2.5 text-end font-semibold">
              {c.cashOut}
            </th>
            <th scope="col" className="px-4 py-2.5 text-end font-semibold">
              {c.closing}
            </th>
          </tr>
        </thead>
        <tbody>
          {book.days.length === 0 ? (
            <tr className="border-t">
              <td
                colSpan={5}
                className="text-muted-foreground px-4 py-6 text-center"
              >
                {c.empty}
              </td>
            </tr>
          ) : (
            book.days.map((day, i) => (
              <tr key={day.date} className="border-t">
                <th scope="row" className="px-4 py-3 text-start font-semibold">
                  <Link
                    href={paymentRoutes.cashBookOf(day.date)}
                    className="focus-visible:ring-ring/50 rounded-sm outline-none hover:underline focus-visible:ring-3"
                  >
                    <time dateTime={day.date}>{formatDate(day.date)}</time>
                  </Link>
                </th>
                <Money
                  value={
                    i === 0 ? book.openingCash : book.days[i - 1].closingCash
                  }
                  muted
                />
                <Money value={day.cashIn} className="text-success" />
                <Money value={day.cashOut} className="text-warning" />
                <Money value={day.closingCash} strong />
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2">
            <th scope="row" className="px-4 py-3 text-start font-bold">
              {c.total}
            </th>
            <Money value={book.openingCash} muted />
            <Money value={book.totals.cashIn} strong className="text-success" />
            <Money
              value={book.totals.cashOut}
              strong
              className="text-warning"
            />
            <Money value={book.closingCash} strong />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Money({
  value,
  strong,
  muted,
  className,
}: {
  value: string;
  strong?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-3 py-3 text-end tabular-nums last:pe-4",
        strong && "font-bold",
        muted && "text-muted-foreground",
        className,
      )}
    >
      <span dir="ltr">{formatRs(value)}</span>
    </td>
  );
}
