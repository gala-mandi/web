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
import { saleParchi } from "@/features/parchi/parchi";
import { useCanWrite } from "@/features/subscription/hooks";
import { toListSearchParams } from "@/lib/list-query";
import { saleRoutes } from "@/lib/routes";
import { purchaseStatusText } from "@/features/purchases/text";
import { useSaleLoader, useSales } from "../hooks";
import {
  SALES_TABLE_ID,
  saleListFilters,
  saleListStatuses,
} from "../search-params";
import { saleText } from "../text";
import { type SaleListQuery, saleSortFields, type SaleSummary } from "../types";
import { CancelSaleDialog } from "./cancel-sale-dialog";
import { saleColumns } from "./sale-columns";

const t = saleText.list;

const statusOptions = saleListStatuses.map((status) => ({
  value: status,
  label: purchaseStatusText[status],
  dotClassName: status === "posted" ? "bg-success" : "bg-destructive",
}));

const getRowId = (row: SaleSummary) => row.id;
const getRowLabel = (row: SaleSummary) => row.billNo;

/** `/sales`: everyone with `sale.view`. */
export function SalesPage() {
  return (
    <RequirePermission permission="sale.view">
      <SalesList />
    </RequirePermission>
  );
}

/**
 * Date range, beopari, commodity, status, search, sort and page live in the
 * URL, so reload and Back keep the view. Edit is for the owner and managers,
 * cancel for the owner only.
 */
function SalesList() {
  const router = useRouter();
  const section = panelText.sections.sales;
  const canCreate = useCanWrite("sale.create");
  const canEdit = useCanWrite("sale.edit");
  const canCancel = useCanWrite("sale.delete");
  const [cancelling, setCancelling] = useState<SaleSummary | null>(null);
  const load = useSaleLoader();
  const reprinter = useReprint(async (id) => saleParchi(await load(id)));
  const reprint = reprinter.reprint;
  // The picked beopari as the picker shows it (the URL keeps only the id).
  const [pickedBuyer, setPickedBuyer] = useState<TraderLookupItem | null>(null);

  const list = useDataTableState({
    filters: saleListFilters,
    sortFields: saleSortFields,
    defaultSort: "-saleDate",
  });
  const { columnVisibility, onColumnVisibilityChange } =
    useColumnVisibility(SALES_TABLE_ID);
  const commodities = useEveryCommodity();

  const listQuery: SaleListQuery = toListSearchParams(list.listParams);
  const query = useSales(listQuery);
  const rows = query.data?.data;

  const columns = useMemo(
    () =>
      saleColumns({
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

  const buyerId = list.filters.buyer;
  // After a reload only the id is known; every row then has that beopari.
  const buyerValue: TraderLookupItem | null = !buyerId
    ? null
    : pickedBuyer?.id === buyerId
      ? pickedBuyer
      : {
          id: buyerId,
          type: "beopari",
          name:
            rows?.find((row) => row.buyer.id === buyerId)?.buyer.name ??
            t.buyerLabel,
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
      <Link href={saleRoutes.new}>
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
                htmlFor="sales-buyer-filter"
                className="text-[13px] font-semibold"
              >
                {t.buyerLabel}
              </label>
              <TraderCombobox
                id="sales-buyer-filter"
                type="beopari"
                allowQuickAdd={false}
                value={buyerValue}
                placeholder={t.buyerAll}
                onChange={(trader) => {
                  setPickedBuyer(trader);
                  list.setFilter("buyer", trader?.id ?? null);
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
          setPickedBuyer(null);
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
        onRowClick={(row) => router.push(saleRoutes.detail(row.id))}
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
                    setPickedBuyer(null);
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
        <CancelSaleDialog
          sale={cancelling}
          onClose={() => setCancelling(null)}
        />
      ) : null}
    </div>
  );
}
