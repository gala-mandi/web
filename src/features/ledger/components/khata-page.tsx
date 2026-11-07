"use client";

import { useTranslations } from "next-intl";
import { BookOpenText, CircleAlert, Scale, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DataTable,
  DataTableDateRangeFilter,
  DataTableToolbar,
  useDataTableState,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { TraderTypeBadge } from "@/features/traders/components/badges";
import { TraderCombobox } from "@/features/traders/components/trader-combobox";
import { TraderName } from "@/features/traders/components/trader-name";
import type { TraderLookupItem } from "@/features/traders/types";
import { toApiError } from "@/lib/api-error";
import { useCan } from "@/lib/can";
import { useFormat } from "@/lib/use-format";
import { ledgerRoutes } from "@/lib/routes";
import { useStatement } from "../hooks";
import { KHATA_PAGE_SIZE, khataFilters } from "../search-params";
import { sourceHref } from "../sources";
import { STATEMENT_MAX_LIMIT, type StatementEntry } from "../types";
import { BalanceAmount } from "./balance-amount";
import { entryColumns } from "./entry-columns";
import { StatementActions } from "./statement-actions";

const getRowId = (row: StatementEntry) => String(row.id);

/** `/ledger`: owners and managers (`ledger.view`). */
export function KhataPage() {
  return (
    <RequirePermission permission="ledger.view">
      <Khata />
    </RequirePermission>
  );
}

/**
 * A trader's khata: trader and dates in the URL (`?trader=&from=&to=`),
 * opening balance, the lines with their running balance (paged by the
 * server), closing balance, and the statement to print or export.
 */
function Khata() {
  const { formatDate } = useFormat();
  const t = useTranslations("ledger");
  const router = useRouter();
  const section = useTranslations("panel.sections.ledger");
  const format = useFormat();
  const access = {
    purchases: useCan("purchase.view"),
    sales: useCan("sale.view"),
    payments: useCan("payment.view"),
  };
  // The picked trader as the picker shows it (the URL keeps only the id).
  const [picked, setPicked] = useState<TraderLookupItem | null>(null);

  const list = useDataTableState({
    filters: khataFilters,
    pageSize: KHATA_PAGE_SIZE,
    maxPageSize: STATEMENT_MAX_LIMIT,
  });
  const { trader: traderId, from, to } = list.filters;
  const query = useStatement(traderId, {
    page: list.listParams.page,
    limit: list.listParams.limit,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });
  const statement = query.data?.trader.id === traderId ? query.data : null;

  const { purchases, sales, payments } = access;
  const columns = useMemo(
    () => entryColumns(t, format, { purchases, sales, payments }),
    [t, format, purchases, sales, payments],
  );

  const error = query.isError ? toApiError(query.error).status : null;
  if (error === 403) return <ForbiddenState />;

  // After a reload only the id is known; the statement then names the trader.
  const pickerValue: TraderLookupItem | null = !traderId
    ? null
    : picked?.id === traderId
      ? picked
      : statement
        ? {
            id: statement.trader.id,
            type: statement.trader.type,
            name: statement.trader.name,
            fatherName: null,
            phone: null,
            village: null,
          }
        : null;

  const dateFiltered = Boolean(from || to);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={section("label")}
        description={section("description")}
        actions={
          <Button asChild variant="outline" className="h-10 gap-2">
            <Link href={ledgerRoutes.balances}>
              <Scale aria-hidden />
              {t("khata.balancesLink")}
            </Link>
          </Button>
        }
      />

      <DataTableToolbar
        filters={
          <>
            <div className="flex flex-col gap-1.5 sm:w-72">
              <label
                htmlFor="khata-trader"
                className="text-[13px] font-semibold"
              >
                {t("khata.traderLabel")}
              </label>
              <TraderCombobox
                id="khata-trader"
                allowQuickAdd={false}
                value={pickerValue}
                placeholder={t("khata.traderPlaceholder")}
                onChange={(trader) => {
                  setPicked(trader);
                  list.setFilter("trader", trader?.id ?? null);
                }}
                className="h-10"
              />
            </div>
            <DataTableDateRangeFilter
              label={t("khata.dateLabel")}
              value={{ from, to }}
              onChange={(range) => list.setFilters(range)}
            />
          </>
        }
        actions={
          traderId && statement ? (
            <StatementActions traderId={traderId} from={from} to={to} />
          ) : null
        }
      />

      {!traderId ? (
        <EmptyState
          icon={BookOpenText}
          title={t("khata.pick.title")}
          body={t("khata.pick.body")}
        />
      ) : error === 404 || error === 400 ? (
        <EmptyState
          role="alert"
          icon={UserX}
          title={t("khata.notFound.title")}
          body={t("khata.notFound.body")}
        />
      ) : query.isError ? (
        <EmptyState
          role="alert"
          icon={CircleAlert}
          title={t("khata.error.title")}
          body={t("khata.error.body")}
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              {t("khata.error.retry")}
            </Button>
          }
        />
      ) : (
        <>
          {statement ? (
            <section
              aria-label={t("khata.caption", { name: statement.trader.name })}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl font-bold">
                  <TraderName name={statement.trader.name} />
                </h2>
                <TraderTypeBadge type={statement.trader.type} />
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <BalanceCard
                  label={t("khata.openingBalance")}
                  note={
                    statement.from
                      ? t("khata.openingOn", {
                          day: formatDate(statement.from),
                        })
                      : t("khata.openingAll")
                  }
                  balance={statement.openingBalance}
                  testId="khata-opening"
                />
                <BalanceCard
                  label={t("khata.closingBalance")}
                  note={
                    statement.to
                      ? t("khata.closingOn", { day: formatDate(statement.to) })
                      : t("khata.closingNow")
                  }
                  balance={statement.closingBalance}
                  testId="khata-closing"
                  strong
                />
              </dl>
              <Legend />
            </section>
          ) : null}

          <DataTable
            caption={
              statement
                ? t("khata.caption", { name: statement.trader.name })
                : t("khata.entriesTitle")
            }
            columns={columns}
            data={statement?.data}
            getRowId={getRowId}
            rowCount={statement?.meta.total ?? 0}
            pagination={list.pagination}
            onPaginationChange={list.onPaginationChange}
            isLoading={!statement}
            isFetching={query.isPlaceholderData}
            isError={false}
            onRowClick={(row) => {
              const href = sourceHref(row, access);
              if (href) router.push(href);
            }}
            empty={
              <EmptyState
                icon={BookOpenText}
                title={t("khata.empty.title")}
                body={
                  dateFiltered
                    ? t("khata.empty.body")
                    : t("khata.empty.bodyAll")
                }
                className="rounded-none border-0"
                action={
                  dateFiltered ? (
                    <Button
                      variant="outline"
                      onClick={() => list.setFilters({ from: null, to: null })}
                    >
                      {t("khata.empty.clear")}
                    </Button>
                  ) : null
                }
              />
            }
          />
        </>
      )}
    </div>
  );
}

function BalanceCard({
  label,
  note,
  balance,
  testId,
  strong = false,
}: {
  label: string;
  note: string;
  balance: string;
  testId: string;
  strong?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-card rounded-card flex flex-col gap-1 border px-5 py-4"
    >
      <dt className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground text-xs">{note}</span>
      </dt>
      <dd>
        <BalanceAmount
          balance={balance}
          showHint
          className={strong ? "text-2xl" : "text-xl"}
        />
      </dd>
    </div>
  );
}

/** Dr / Cr in plain words, in their colours. */
function Legend() {
  const t = useTranslations("ledger");
  return (
    <section
      aria-label={t("legend.label")}
      className="text-muted-foreground flex flex-col gap-1 text-sm sm:flex-row sm:gap-6"
    >
      <p>
        <span className="text-success font-bold">{t("dr")}</span>{" "}
        {t("legend.dr")}
      </p>
      <p>
        <span className="text-destructive font-bold">{t("cr")}</span>{" "}
        {t("legend.cr")}
      </p>
    </section>
  );
}
