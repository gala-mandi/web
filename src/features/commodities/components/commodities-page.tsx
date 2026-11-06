"use client";

import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/use-format";
import { categoryLabel, suggestedCategories } from "../categories";
import type { CommoditiesTranslator } from "../schemas";
import { Plus, Search, Wheat } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DataTable,
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
import { toApiError } from "@/lib/api-error";
import { useCanWrite } from "@/features/subscription/hooks";
import { toListSearchParams } from "@/lib/list-query";
import { useCommodities } from "../hooks";
import {
  COMMODITIES_TABLE_ID,
  commodityListFilters,
  commodityStatuses,
} from "../search-params";
import {
  type Commodity,
  type CommodityListQuery,
  commoditySortFields,
} from "../types";
import { commodityColumns } from "./commodity-columns";
import {
  type CommodityStatusAction,
  CommodityStatusDialog,
  DeleteCommodityDialog,
} from "./commodity-dialogs";
import { CommodityFormSheet } from "./commodity-form-sheet";

const statusOptions = (t: CommoditiesTranslator) =>
  commodityStatuses.map((status) => ({
    value: status,
    label: status === "active" ? t("active") : t("inactive"),
    dotClassName: status === "active" ? "bg-success" : "bg-muted-foreground",
  }));

/** The shop's starting categories, plus one from the URL that isn't among them. */
function categoryOptions(t: CommoditiesTranslator, current: string | null) {
  const values: string[] = [...suggestedCategories];
  if (current && !values.includes(current.toLowerCase())) values.push(current);
  return values.map((value) => ({ value, label: categoryLabel(t, value) }));
}

const getRowId = (row: Commodity) => row.id;
const getRowLabel = (row: Commodity) => row.name;

type OpenDialog =
  | { kind: "status"; commodity: Commodity; action: CommodityStatusAction }
  | { kind: "delete"; commodity: Commodity };

/**
 * `/commodities`: needs `commodity.manage` (operators only pick commodities
 * in forms, through `CommodityCombobox`).
 */
export function CommoditiesPage() {
  return (
    <RequirePermission permission="commodity.manage">
      <CommoditiesList />
    </RequirePermission>
  );
}

/**
 * Search, status and category filters, sort and page live in the URL
 * (`?q=&status=&category=&page=&sort=`), so reload and Back keep the view.
 */
function CommoditiesList() {
  const format = useFormat();
  const t = useTranslations("commodities");
  const section = useTranslations("panel.sections.commodities");
  const canManage = useCanWrite("commodity.manage");
  const canDelete = useCanWrite("commodity.delete");
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  // Kept while the sheet closes, so its content doesn't jump.
  const [formCommodity, setFormCommodity] = useState<Commodity | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const list = useDataTableState({
    filters: commodityListFilters,
    sortFields: commoditySortFields,
    defaultSort: "name",
  });
  const { columnVisibility, onColumnVisibilityChange } =
    useColumnVisibility(COMMODITIES_TABLE_ID);

  const { status, ...params } = toListSearchParams(list.listParams);
  const listQuery: CommodityListQuery = {
    ...params,
    ...(status ? { active: status === "active" } : {}),
  };
  const query = useCommodities(listQuery);
  const rows = query.data?.data;

  const openForm = (commodity: Commodity | null) => {
    setFormCommodity(commodity);
    setFormOpen(true);
  };

  const columns = useMemo(
    () =>
      commodityColumns(t, format, {
        canManage,
        canDelete,
        onEdit: (commodity) => {
          setFormCommodity(commodity);
          setFormOpen(true);
        },
        onStatus: (commodity, action) =>
          setDialog({ kind: "status", commodity, action }),
        onDelete: (commodity) => setDialog({ kind: "delete", commodity }),
      }),
    [canManage, canDelete, t, format],
  );

  if (query.isError && toApiError(query.error).status === 403) {
    return <ForbiddenState />;
  }

  const addButton = canManage ? (
    <Button
      size="lg"
      className="h-10 gap-2 px-4 font-semibold"
      onClick={() => openForm(null)}
    >
      <Plus aria-hidden />
      {t("list.addButton")}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={section("label")}
        description={section("description")}
        actions={addButton}
      />

      <DataTableToolbar
        search={{
          value: list.search,
          onChange: list.setSearch,
          label: t("list.searchLabel"),
          placeholder: t("list.searchPlaceholder"),
        }}
        filters={
          <>
            <DataTableStatusFilter
              label={t("list.statusLabel")}
              allLabel={t("list.statusAll")}
              value={list.filters.status}
              options={statusOptions(t)}
              onChange={(value) => list.setFilter("status", value)}
            />
            <DataTableSelectFilter
              label={t("list.categoryLabel")}
              allLabel={t("list.categoryAll")}
              value={list.filters.category}
              options={categoryOptions(t, list.filters.category)}
              onChange={(value) => list.setFilter("category", value)}
            />
          </>
        }
        isFiltered={list.isFiltered}
        onClearFilters={list.clearAll}
        actions={
          <>
            <DataTableViewOptions
              columns={columns}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={onColumnVisibilityChange}
            />
            <DataTableExport
              fileName={t("list.exportFileName")}
              columns={columns}
              rows={rows}
              columnVisibility={columnVisibility}
            />
          </>
        }
      />

      <DataTable
        caption={t("list.caption")}
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
        onRowClick={canManage ? (row) => openForm(row) : undefined}
        empty={
          list.isFiltered ? (
            <EmptyState
              icon={Search}
              title={t("list.noMatches.title")}
              body={t("list.noMatches.body")}
              className="rounded-none border-0"
              action={
                <Button variant="outline" onClick={list.clearAll}>
                  {t("list.noMatches.clear")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Wheat}
              title={t("list.empty.title")}
              body={t("list.empty.body")}
              className="rounded-none border-0"
              action={addButton}
            />
          )
        }
      />

      <CommodityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        commodity={formCommodity}
      />

      {dialog?.kind === "status" ? (
        <CommodityStatusDialog
          commodity={dialog.commodity}
          action={dialog.action}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <DeleteCommodityDialog
          commodity={dialog.commodity}
          canDeactivate={canManage && dialog.commodity.isActive}
          onDeactivate={() =>
            setDialog({
              kind: "status",
              commodity: dialog.commodity,
              action: "deactivate",
            })
          }
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
