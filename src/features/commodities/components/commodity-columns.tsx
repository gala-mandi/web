"use client";

import { bidi } from "@/i18n/bidi";
import { useTranslations } from "next-intl";
import { categoryLabel } from "../categories";
import { CircleCheck, CircleOff, Pencil, Trash2 } from "lucide-react";
import {
  type DataTableColumn,
  dataTableColumnHelper,
  DataTableRowActions,
} from "@/components/data-table";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TraderName } from "@/features/traders/components/trader-name";
import type { Formatters } from "@/lib/use-format";
import type { CommoditiesTranslator } from "../schemas";
import { type ChargeField, chargeFields, type Commodity } from "../types";
import { CommodityStatusBadge } from "./badges";
import type { CommodityStatusAction } from "./commodity-dialogs";
import { UrduName } from "./commodity-name";

const col = dataTableColumnHelper<Commodity>();

export interface CommodityRowActions {
  /** `commodity.manage`: Edit, Deactivate / Activate. */
  canManage: boolean;
  /** `commodity.delete`. */
  canDelete: boolean;
  onEdit: (commodity: Commodity) => void;
  onStatus: (commodity: Commodity, action: CommodityStatusAction) => void;
  onDelete: (commodity: Commodity) => void;
}

/** "2.50" → "2.50%", "12.00" → "Rs 12.00". */
function chargeValue(
  t: CommoditiesTranslator,
  formatRs: (value: string) => string,
  field: ChargeField,
  value: string,
): string {
  return field === "labourPerBag" ? formatRs(value) : t("percent", { value });
}

/** The overrides as text, e.g. ["Commission 2.50%"]; empty = shop default. */
export function chargeOverrides(
  t: CommoditiesTranslator,
  { formatRs }: Pick<Formatters, "formatRs">,
  commodity: Commodity,
): string[] {
  return chargeFields.flatMap((field) => {
    const value = commodity[field];
    return value === null
      ? []
      : [
          t("list.charge", {
            label: t(`form.charges.${field}`),
            value: chargeValue(t, formatRs, field, value),
          }),
        ];
  });
}

function RowActions({
  commodity,
  actions,
}: {
  commodity: Commodity;
  actions: CommodityRowActions;
}) {
  const t = useTranslations("commodities");
  if (!actions.canManage && !actions.canDelete) return null;
  return (
    <DataTableRowActions rowName={commodity.name}>
      {actions.canManage ? (
        <>
          <DropdownMenuItem onSelect={() => actions.onEdit(commodity)}>
            <Pencil aria-hidden />
            {t("actions.edit")}
          </DropdownMenuItem>
          {commodity.isActive ? (
            <DropdownMenuItem
              onSelect={() => actions.onStatus(commodity, "deactivate")}
            >
              <CircleOff aria-hidden />
              {t("actions.deactivate")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => actions.onStatus(commodity, "activate")}
            >
              <CircleCheck aria-hidden />
              {t("actions.activate")}
            </DropdownMenuItem>
          )}
        </>
      ) : null}
      {actions.canDelete ? (
        <>
          {actions.canManage ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => actions.onDelete(commodity)}
          >
            <Trash2 aria-hidden />
            {t("actions.delete")}
          </DropdownMenuItem>
        </>
      ) : null}
    </DataTableRowActions>
  );
}

/** Columns of the commodities list; only name and added date sort (server-side). */
export function commodityColumns(
  t: CommoditiesTranslator,
  format: Formatters,
  actions: CommodityRowActions,
): DataTableColumn<Commodity>[] {
  const { formatDate, formatKg } = format;
  const none = <span className="text-muted-foreground">{t("none")}</span>;
  return col.columns([
    col.accessor("name", {
      header: t("list.columns.name"),
      meta: { label: t("list.columns.name") },
      cell: ({ row }) =>
        actions.canManage ? (
          <button
            type="button"
            onClick={() => actions.onEdit(row.original)}
            aria-label={t("actions.editName", {
              name: bidi(row.original.name),
            })}
            className="text-foreground focus-visible:ring-ring/50 w-fit rounded-sm text-start font-semibold outline-none hover:underline focus-visible:ring-3"
          >
            <TraderName name={row.original.name} />
          </button>
        ) : (
          <TraderName name={row.original.name} className="font-semibold" />
        ),
    }),
    col.accessor("nameUr", {
      header: t("list.columns.nameUr"),
      enableSorting: false,
      meta: { label: t("list.columns.nameUr") },
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <UrduName name={value} className="text-base" /> : none;
      },
    }),
    col.accessor("category", {
      header: t("list.columns.category"),
      enableSorting: false,
      meta: {
        label: t("list.columns.category"),
        exportValue: (row: Commodity) =>
          row.category ? categoryLabel(t, row.category) : "",
      },
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <bdi dir="auto">{categoryLabel(t, value)}</bdi> : none;
      },
    }),
    col.accessor("defaultUnit", {
      header: t("list.columns.defaultUnit"),
      enableSorting: false,
      meta: {
        label: t("list.columns.defaultUnit"),
        exportValue: (row: Commodity) => t(`unitsShort.${row.defaultUnit}`),
      },
      cell: ({ row }) => t(`unitsShort.${row.original.defaultUnit}`),
    }),
    col.accessor("bagWeightKg", {
      header: t("list.columns.bagWeight"),
      enableSorting: false,
      meta: {
        align: "end",
        label: t("list.columns.bagWeight"),
        exportValue: (row: Commodity) => formatKg(row.bagWeightKg),
      },
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? (
          <span dir="auto" className="tabular-nums">
            {formatKg(value)}
          </span>
        ) : (
          none
        );
      },
    }),
    col.display({
      id: "charges",
      header: t("list.columns.charges"),
      enableSorting: false,
      meta: {
        label: t("list.columns.charges"),
        exportValue: (row: Commodity) => {
          const overrides = chargeOverrides(t, format, row);
          return overrides.length > 0
            ? overrides.join(", ")
            : t("list.shopDefault");
        },
      },
      cell: ({ row }) => {
        const overrides = chargeOverrides(t, format, row.original);
        return overrides.length > 0 ? (
          <ul className="flex flex-col text-[13px] tabular-nums">
            {overrides.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">{t("list.shopDefault")}</span>
        );
      },
    }),
    col.accessor("isActive", {
      id: "status",
      header: t("list.columns.status"),
      enableSorting: false,
      meta: {
        label: t("list.columns.status"),
        exportValue: (row: Commodity) =>
          row.isActive ? t("active") : t("inactive"),
      },
      cell: ({ getValue }) => <CommodityStatusBadge active={getValue()} />,
    }),
    col.accessor("createdAt", {
      header: t("list.columns.added"),
      sortDescFirst: true,
      meta: {
        label: t("list.columns.added"),
        exportValue: (row: Commodity) => formatDate(row.createdAt),
      },
      cell: ({ getValue }) => (
        <time dateTime={getValue()} className="text-muted-foreground">
          {formatDate(getValue())}
        </time>
      ),
    }),
    col.display({
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      meta: { align: "end", className: "w-12" },
      cell: ({ row }) => (
        <RowActions commodity={row.original} actions={actions} />
      ),
    }),
  ]);
}
