"use client";

import { useTranslations } from "next-intl";
import type { Translator } from "@/i18n/types";
import { BookOpenText, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo } from "react";
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
import { traderTypes } from "@/features/traders/types";
import { toApiError } from "@/lib/api-error";
import { useFormat } from "@/lib/use-format";
import { toListSearchParams } from "@/lib/list-query";
import { ledgerRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useBalances } from "../hooks";
import { balanceFilters } from "../search-params";
import {
  type BalanceSort,
  balanceSortFields,
  type BalancesQuery,
  type TraderBalance,
} from "../types";
import { balanceTone } from "./balance-amount";
import { balanceColumns } from "./balance-columns";

/** Biggest amounts first: what traders owe you, down to what you owe them. */
const DEFAULT_SORT: BalanceSort = "-balance";
const sortOptions = [
  "-balance",
  "balance",
  "name",
  "-name",
] as const satisfies readonly BalanceSort[];

const typeOptions = (t: Translator<"traders">) =>
  traderTypes.map((type) => ({ value: type, label: t(`types.${type}`) }));

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
  const t = useTranslations("ledger");
  const tTraders = useTranslations("traders");
  const columns = useMemo(() => balanceColumns(t), [t]);
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
        title={t("balances.title")}
        description={t("balances.description")}
        actions={
          <Button asChild variant="outline" className="h-10 gap-2">
            <Link href={ledgerRoutes.khata()}>
              <BookOpenText aria-hidden />
              {t("balances.khataLink")}
            </Link>
          </Button>
        }
      />

      <dl className="grid gap-3 sm:grid-cols-2">
        <Total
          label={t("balances.totalReceivable")}
          hint={t("balances.totalReceivableHint")}
          amount={totals?.receivable}
          tone={balanceTone.receivable}
          testId="balances-total-receivable"
        />
        <Total
          label={t("balances.totalPayable")}
          hint={t("balances.totalPayableHint")}
          amount={totals?.payable}
          tone={balanceTone.payable}
          testId="balances-total-payable"
        />
      </dl>

      <DataTableToolbar
        search={{
          value: list.search,
          onChange: list.setSearch,
          label: t("balances.searchLabel"),
          placeholder: t("balances.searchPlaceholder"),
        }}
        filters={
          <>
            <DataTableSelectFilter
              label={t("balances.typeLabel")}
              allLabel={t("balances.typeAll")}
              value={list.filters.type}
              options={typeOptions(tTraders)}
              onChange={(value) => list.setFilter("type", value)}
            />
            <div className="flex flex-col gap-1.5 sm:w-56">
              <label htmlFor={sortId} className="text-[13px] font-semibold">
                {t("balances.sortLabel")}
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
                      {t(`balances.sorts.${value}`)}
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
        caption={t("balances.caption")}
        columns={columns}
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
              title={t("balances.noMatches.title")}
              body={t("balances.noMatches.body")}
              className="rounded-none border-0"
              action={
                <Button variant="outline" onClick={list.clearAll}>
                  {t("balances.noMatches.clear")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title={t("balances.empty.title")}
              body={t("balances.empty.body")}
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
  const { formatRs } = useFormat();
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
        dir="auto"
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
