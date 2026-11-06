"use client";

import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/use-format";
import { Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DataTable,
  DataTableExport,
  DataTableStatusFilter,
  DataTableToolbar,
  DataTableViewOptions,
  useColumnVisibility,
  useDataTableState,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { toApiError } from "@/lib/api-error";
import { useCanWrite } from "@/features/subscription/hooks";
import { toListSearchParams } from "@/lib/list-query";
import { traderRoutes } from "@/lib/routes";
import { useTraders } from "../hooks";
import {
  TRADERS_TABLE_ID,
  traderListFilters,
  traderStatuses,
} from "../search-params";
import {
  type Trader,
  type TraderListQuery,
  traderSortFields,
  type TraderType,
  traderTypes,
} from "../types";
import { traderColumns } from "./trader-columns";
import {
  DeleteTraderDialog,
  type TraderStatusAction,
  TraderStatusDialog,
} from "./trader-dialogs";
import { TraderFormSheet } from "./trader-form-sheet";
import type { TradersTranslator } from "../schemas";

const ALL = "all";

const statusOptions = (t: TradersTranslator) =>
  traderStatuses.map((status) => ({
    value: status,
    label: status === "active" ? t("active") : t("inactive"),
    dotClassName: status === "active" ? "bg-success" : "bg-muted-foreground",
  }));

const getRowId = (row: Trader) => row.id;
const getRowLabel = (row: Trader) => row.name;

type OpenDialog =
  | { kind: "status"; trader: Trader; action: TraderStatusAction }
  | { kind: "delete"; trader: Trader };

/** `/traders`: needs `trader.manage` (operators only pick traders in forms). */
export function TradersPage() {
  return (
    <RequirePermission permission="trader.manage">
      <TradersList />
    </RequirePermission>
  );
}

/**
 * Type tabs, search, status filter, sort and page live in the URL
 * (`?type=&status=&q=&page=&sort=`), so reload and Back keep the view.
 */
function TradersList() {
  const format = useFormat();
  const t = useTranslations("traders");
  const router = useRouter();
  const section = useTranslations("panel.sections.traders");
  const canCreate = useCanWrite("trader.create");
  const canManage = useCanWrite("trader.manage");
  const canDelete = useCanWrite("trader.delete");
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  // Kept while the sheet closes, so its content doesn't jump.
  const [formTrader, setFormTrader] = useState<Trader | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const list = useDataTableState({
    filters: traderListFilters,
    sortFields: traderSortFields,
    defaultSort: "name",
  });
  const { columnVisibility, onColumnVisibilityChange } =
    useColumnVisibility(TRADERS_TABLE_ID);

  const { status, ...params } = toListSearchParams(list.listParams);
  const listQuery: TraderListQuery = {
    ...params,
    ...(status ? { active: status === "active" } : {}),
  };
  const query = useTraders(listQuery);
  const rows = query.data?.data;

  const openForm = (trader: Trader | null) => {
    setFormTrader(trader);
    setFormOpen(true);
  };

  const columns = useMemo(
    () =>
      traderColumns(t, format, {
        canManage,
        canDelete,
        onEdit: (trader) => {
          setFormTrader(trader);
          setFormOpen(true);
        },
        onStatus: (trader, action) =>
          setDialog({ kind: "status", trader, action }),
        onDelete: (trader) => setDialog({ kind: "delete", trader }),
      }),
    [canManage, canDelete, t, format],
  );

  if (query.isError && toApiError(query.error).status === 403) {
    return <ForbiddenState />;
  }

  const type = list.filters.type;
  const addButton = canCreate ? (
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

      <Tabs
        value={type ?? ALL}
        onValueChange={(value) =>
          list.setFilter("type", value === ALL ? null : (value as TraderType))
        }
      >
        <TabsList aria-label={t("list.tabsLabel")}>
          <TabsTrigger value={ALL} className="px-3">
            {t("list.allTypes")}
          </TabsTrigger>
          {traderTypes.map((value) => (
            <TabsTrigger key={value} value={value} className="px-3">
              {t(`types.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTableToolbar
        search={{
          value: list.search,
          onChange: list.setSearch,
          label: t("list.searchLabel"),
          placeholder: t("list.searchPlaceholder"),
        }}
        filters={
          <DataTableStatusFilter
            label={t("list.statusLabel")}
            allLabel={t("list.statusAll")}
            value={list.filters.status}
            options={statusOptions(t)}
            onChange={(value) => list.setFilter("status", value)}
          />
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
        onRowClick={(row) => router.push(traderRoutes.detail(row.id))}
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
              icon={Users}
              title={t("list.empty.title")}
              body={t("list.empty.body")}
              className="rounded-none border-0"
              action={addButton}
            />
          )
        }
      />

      <TraderFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        trader={formTrader}
        prefill={{ type: type ?? undefined }}
      />

      {dialog?.kind === "status" ? (
        <TraderStatusDialog
          trader={dialog.trader}
          action={dialog.action}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <DeleteTraderDialog
          trader={dialog.trader}
          canDeactivate={canManage && dialog.trader.isActive}
          onDeactivate={() =>
            setDialog({
              kind: "status",
              trader: dialog.trader,
              action: "deactivate",
            })
          }
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
