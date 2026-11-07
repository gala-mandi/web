"use client";

import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/use-format";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  HandCoins,
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
import { RequirePermission } from "@/features/panel/components/require-permission";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { toApiError } from "@/lib/api-error";
import { useCanWrite } from "@/features/subscription/hooks";
import { karachiToday } from "@/lib/format";
import { paymentRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useCashBook, usePayments } from "../hooks";
import {
  type PaymentListQuery,
  paymentSortFields,
  type PaymentSummary,
} from "../types";
import {
  CashBookDaysTable,
  CashBookSkeleton,
  CashBookTotals,
} from "./cash-book-summary";
import { cashVoucherColumns } from "./cash-voucher-columns";

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
  const t = useTranslations("payments");
  const router = useRouter();
  const [today] = useState(() => karachiToday());
  const canCreate = useCanWrite("payment.create");
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
  const format = useFormat();
  const columns = useMemo(() => cashVoucherColumns(t, format), [t, format]);

  const status = book.isError ? toApiError(book.error).status : null;
  if (status === 403) return <ForbiddenState />;

  const showDay = (day: string) => list.setFilters({ from: day, to: day });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("cashBook.title")}
        description={t("cashBook.description")}
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
                  {t("cashBook.receiveButton")}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="h-10 gap-2 px-4 font-semibold"
              >
                <Link href={paymentRoutes.new("paid")}>
                  <ArrowUpRight aria-hidden />
                  {t("cashBook.payButton")}
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      <div className="flex flex-wrap items-end gap-2">
        <DataTableDateRangeFilter
          label={t("cashBook.datesLabel")}
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
              aria-label={t("cashBook.previousDay")}
              onClick={() => showDay(shiftDay(from, -1))}
            >
              <ChevronLeft aria-hidden className="rtl:rotate-180" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10"
              aria-label={t("cashBook.nextDay")}
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
          {t("cashBook.today")}
        </Button>
      </div>

      {book.isPending ? (
        <CashBookSkeleton />
      ) : book.isError ? (
        <EmptyState
          role="alert"
          icon={CircleAlert}
          title={t("cashBook.error.title")}
          body={t("cashBook.error.body")}
          action={
            <Button variant="outline" onClick={() => void book.refetch()}>
              {t("cashBook.error.retry")}
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
          <CashBookTotals book={book.data} />
          <CashBookDaysTable book={book.data} />
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
            {t("cashBook.vouchers.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("cashBook.vouchers.description")}
          </p>
        </div>
        <DataTable
          caption={t("cashBook.vouchers.caption")}
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
              title={t("cashBook.vouchers.empty.title")}
              body={t("cashBook.vouchers.empty.body")}
              className="rounded-none border-0"
            />
          }
        />
      </section>

      <p className="text-muted-foreground text-xs">{t("cashBook.note")}</p>
    </div>
  );
}
