"use client";

import { Plus, ReceiptText, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DataTable,
  DataTableDateRangeFilter,
  DataTableExport,
  DataTableSelectFilter,
  DataTableStatusFilter,
  DataTableToolbar,
  DataTableViewOptions,
  useColumnVisibility,
  useDataTableState,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { panelText } from "@/features/panel/text";
import { useEveryCommodity } from "@/features/rates/hooks";
import { TraderCombobox } from "@/features/traders/components/trader-combobox";
import type { TraderLookupItem } from "@/features/traders/types";
import { toApiError } from "@/lib/api-error";
import { ReprintOutlet } from "@/features/parchi/components/reprint-outlet";
import { useReprint } from "@/features/parchi/hooks";
import { purchaseParchi } from "@/features/parchi/parchi";
import { useCan } from "@/lib/can";
import { toListSearchParams } from "@/lib/list-query";
import { purchaseRoutes } from "@/lib/routes";
import { usePurchaseLoader, usePurchases } from "../hooks";
import {
  PURCHASES_TABLE_ID,
  purchaseListFilters,
  purchaseListStatuses,
} from "../search-params";
import { purchaseStatusText, purchaseText } from "../text";
import {
  type PurchaseListQuery,
  purchaseSortFields,
  type PurchaseSummary,
} from "../types";
import { CancelPurchaseDialog } from "./cancel-purchase-dialog";
import { purchaseColumns } from "./purchase-columns";

const t = purchaseText.list;

const statusOptions = purchaseListStatuses.map((status) => ({
  value: status,
  label: purchaseStatusText[status],
  dotClassName: status === "posted" ? "bg-success" : "bg-destructive",
}));

const getRowId = (row: PurchaseSummary) => row.id;
const getRowLabel = (row: PurchaseSummary) => row.billNo;

/** `/purchases`: everyone with `purchase.view`. */
export function PurchasesPage() {
  return (
    <RequirePermission permission="purchase.view">
      <PurchasesList />
    </RequirePermission>
  );
}

/**
 * Date range, kissan, commodity, status, search, sort and page live in the
 * URL, so reload and Back keep the view. Edit is for the owner and managers,
 * cancel for the owner only.
 */
function PurchasesList() {
  const router = useRouter();
  const section = panelText.sections.purchases;
  const canCreate = useCan("purchase.create");
  const canEdit = useCan("purchase.edit");
  const canCancel = useCan("purchase.delete");
  const [cancelling, setCancelling] = useState<PurchaseSummary | null>(null);
  const load = usePurchaseLoader();
  const reprinter = useReprint(async (id) => purchaseParchi(await load(id)));
  const reprint = reprinter.reprint;
  // The picked kissan as the picker shows it (the URL keeps only the id).
  const [pickedTrader, setPickedTrader] = useState<TraderLookupItem | null>(
    null,
  );

  const list = useDataTableState({
    filters: purchaseListFilters,
    sortFields: purchaseSortFields,
    defaultSort: "-purchaseDate",
  });
  const { columnVisibility, onColumnVisibilityChange } =
    useColumnVisibility(PURCHASES_TABLE_ID);
  const commodities = useEveryCommodity();

  const listQuery: PurchaseListQuery = toListSearchParams(list.listParams);
  const query = usePurchases(listQuery);
  const rows = query.data?.data;

  const columns = useMemo(
    () =>
      purchaseColumns({
        canEdit,
        canCancel,
        onCancel: setCancelling,
        onReprint: (row) => void reprint(row.id),
      }),
    [canEdit, canCancel, reprint],
  );

  if (query.isError && toApiError(query.error).status === 403) {
    return <ForbiddenState />;
  }

  const traderId = list.filters.trader;
  // After a reload only the id is known; every row then has that kissan.
  const traderValue: TraderLookupItem | null = !traderId
    ? null
    : pickedTrader?.id === traderId
      ? pickedTrader
      : {
          id: traderId,
          type: "kissan",
          name:
            rows?.find((row) => row.trader.id === traderId)?.trader.name ??
            t.traderLabel,
          fatherName: null,
          phone: null,
          village: null,
        };

  const commodityOptions = (commodities.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const newButton = canCreate ? (
    <Button asChild size="lg" className="h-10 gap-2 px-4 font-semibold">
      <Link href={purchaseRoutes.new}>
        <Plus aria-hidden />
        {t.newButton}
      </Link>
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={section.label}
        description={section.description}
        actions={newButton}
      />

      <DataTableToolbar
        search={{
          value: list.search,
          onChange: list.setSearch,
          label: t.searchLabel,
          placeholder: t.searchPlaceholder,
        }}
        filters={
          <>
            <DataTableDateRangeFilter
              label={t.dateLabel}
              value={{ from: list.filters.from, to: list.filters.to }}
              onChange={({ from, to }) => list.setFilters({ from, to })}
            />
            <div className="flex flex-col gap-1.5 sm:w-52">
              <label
                htmlFor="purchases-trader-filter"
                className="text-[13px] font-semibold"
              >
                {t.traderLabel}
              </label>
              <TraderCombobox
                id="purchases-trader-filter"
                type="kissan"
                allowQuickAdd={false}
                value={traderValue}
                placeholder={t.traderAll}
                onChange={(trader) => {
                  setPickedTrader(trader);
                  list.setFilter("trader", trader?.id ?? null);
                }}
                className="h-10"
              />
            </div>
            <DataTableSelectFilter
              label={t.commodityLabel}
              allLabel={t.commodityAll}
              value={list.filters.commodity}
              options={commodityOptions}
              onChange={(value) => list.setFilter("commodity", value)}
            />
            <DataTableStatusFilter
              label={t.statusLabel}
              allLabel={t.statusAll}
              value={list.filters.status}
              options={statusOptions}
              onChange={(value) => list.setFilter("status", value)}
            />
          </>
        }
        isFiltered={list.isFiltered}
        onClearFilters={() => {
          setPickedTrader(null);
          list.clearAll();
        }}
        actions={
          <>
            <DataTableViewOptions
              columns={columns}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={onColumnVisibilityChange}
            />
            <DataTableExport
              fileName={t.exportFileName}
              columns={columns}
              rows={rows}
              columnVisibility={columnVisibility}
            />
          </>
        }
      />

      <DataTable
        caption={t.caption}
        columns={columns}
        data={rows}
        getRowId={getRowId}
        getRowLabel={getRowLabel}
        rowCount={query.data?.meta.total ?? 0}
        pagination={list.pagination}
        onPaginationChange={list.onPaginationChange}
        sorting={list.sorting}
        onSortingChange={list.onSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={onColumnVisibilityChange}
        isLoading={query.isPending}
        isFetching={query.isPlaceholderData}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        onRowClick={(row) => router.push(purchaseRoutes.detail(row.id))}
        empty={
          list.isFiltered ? (
            <EmptyState
              icon={Search}
              title={t.noMatches.title}
              body={t.noMatches.body}
              className="rounded-none border-0"
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setPickedTrader(null);
                    list.clearAll();
                  }}
                >
                  {t.noMatches.clear}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ReceiptText}
              title={t.empty.title}
              body={t.empty.body}
              className="rounded-none border-0"
              action={newButton}
            />
          )
        }
      />

      <ReprintOutlet reprint={reprinter} />

      {cancelling ? (
        <CancelPurchaseDialog
          purchase={cancelling}
          onClose={() => setCancelling(null)}
        />
      ) : null}
    </div>
  );
}
