"use client";

import { BookOpenText, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import {
  DataTable,
  DataTableSelectFilter,
  DataTableToolbar,
  useDataTableState,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { traderTypeText } from "@/features/traders/text";
import { traderTypes } from "@/features/traders/types";
import { toApiError } from "@/lib/api-error";
import { formatRs } from "@/lib/format";
import { toListSearchParams } from "@/lib/list-query";
import { ledgerRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useBalances } from "../hooks";
import { balanceFilters } from "../search-params";
import { ledgerText } from "../text";
import {
  type BalanceSort,
  balanceSortFields,
  type BalancesQuery,
  type TraderBalance,
} from "../types";
import { balanceTone } from "./balance-amount";
import { balanceColumns } from "./balance-columns";

const t = ledgerText.balances;

/** Biggest amounts first: what traders owe you, down to what you owe them. */
const DEFAULT_SORT: BalanceSort = "-balance";
const sortOptions = Object.keys(t.sorts) as BalanceSort[];

const typeOptions = traderTypes.map((type) => ({
  value: type,
  label: traderTypeText[type],
}));

const getRowId = (row: TraderBalance) => row.traderId;

/** `/ledger/balances`: owners and managers (`ledger.view`). */
export function BalancesPage() {
  return (
    <RequirePermission permission="ledger.view">
      <BalancesList />
    </RequirePermission>
  );
}

/** Every trader's receivable / payable with the shop's totals; URL state. */
function BalancesList() {
  const router = useRouter();
  const sortId = useId();
  const list = useDataTableState({
    filters: balanceFilters,
    sortFields: balanceSortFields,
    defaultSort: DEFAULT_SORT,
  });
  const query: BalancesQuery = toListSearchParams(list.listParams);
  const balances = useBalances(query);
  const sort = list.listParams.sort ?? DEFAULT_SORT;

  if (balances.isError && toApiError(balances.error).status === 403) {
    return <ForbiddenState />;
  }

  const totals = balances.data?.totals;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild variant="outline" className="h-10 gap-2">
            <Link href={ledgerRoutes.khata()}>
              <BookOpenText aria-hidden />
              {t.khataLink}
            </Link>
          </Button>
        }
      />

      <dl className="grid gap-3 sm:grid-cols-2">
        <Total
          label={t.totalReceivable}
          hint={t.totalReceivableHint}
          amount={totals?.receivable}
          tone={balanceTone.receivable}
          testId="balances-total-receivable"
        />
        <Total
          label={t.totalPayable}
          hint={t.totalPayableHint}
          amount={totals?.payable}
          tone={balanceTone.payable}
          testId="balances-total-payable"
        />
      </dl>

      <DataTableToolbar
        search={{
          value: list.search,
          onChange: list.setSearch,
          label: t.searchLabel,
          placeholder: t.searchPlaceholder,
        }}
        filters={
          <>
            <DataTableSelectFilter
              label={t.typeLabel}
              allLabel={t.typeAll}
              value={list.filters.type}
              options={typeOptions}
              onChange={(value) => list.setFilter("type", value)}
            />
            <div className="flex flex-col gap-1.5 sm:w-56">
              <label htmlFor={sortId} className="text-[13px] font-semibold">
                {t.sortLabel}
              </label>
              <Select
                value={sort}
                onValueChange={(value) =>
                  list.onSortingChange([
                    {
                      id: value.replace(/^-/, ""),
                      desc: value.startsWith("-"),
                    },
                  ])
                }
              >
                <SelectTrigger
                  id={sortId}
                  className="rounded-field bg-card data-[size=default]:h-10 w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {sortOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t.sorts[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        }
        isFiltered={list.isFiltered}
        onClearFilters={list.clearAll}
      />

      <DataTable
        caption={t.caption}
        columns={balanceColumns}
        data={balances.data?.data}
        getRowId={getRowId}
        rowCount={balances.data?.meta.total ?? 0}
        pagination={list.pagination}
        onPaginationChange={list.onPaginationChange}
        sorting={list.sorting}
        onSortingChange={list.onSortingChange}
        isLoading={balances.isPending}
        isFetching={balances.isPlaceholderData}
        isError={balances.isError}
        onRetry={() => void balances.refetch()}
        onRowClick={(row) => router.push(ledgerRoutes.khata(row.traderId))}
        empty={
          list.isFiltered ? (
            <EmptyState
              icon={Search}
              title={t.noMatches.title}
              body={t.noMatches.body}
              className="rounded-none border-0"
              action={
                <Button variant="outline" onClick={list.clearAll}>
                  {t.noMatches.clear}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title={t.empty.title}
              body={t.empty.body}
              className="rounded-none border-0"
            />
          )
        }
      />
    </div>
  );
}

function Total({
  label,
  hint,
  amount,
  tone,
  testId,
}: {
  label: string;
  hint: string;
  amount: string | undefined;
  tone: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-card rounded-card flex flex-col gap-1 border px-5 py-4"
    >
      <dt className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground text-xs">{hint}</span>
      </dt>
      <dd
        dir="ltr"
        className={cn(
          "text-end text-2xl font-bold tabular-nums sm:text-start",
          tone,
        )}
      >
        {amount === undefined ? "…" : formatRs(amount)}
      </dd>
    </div>
  );
}
