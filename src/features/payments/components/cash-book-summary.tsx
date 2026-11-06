import {
  ArrowDownLeft,
  ArrowUpRight,
  type LucideIcon,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRs } from "@/lib/format";
import { paymentRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { paymentText } from "../text";
import type { CashBook } from "../types";

/**
 * The cash book's figures: the totals cards and the table of days. Shared
 * by the Payments cash book and the Cash book report (`/reports/cash-book`).
 * The server's numbers, only formatted.
 */

const t = paymentText.cashBook;

/** Loading state of the cash book totals and days. */
export function CashBookSkeleton() {
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
export function CashBookTotals({ book }: { book: CashBook }) {
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
  icon?: LucideIcon;
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
export function CashBookDaysTable({ book }: { book: CashBook }) {
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
