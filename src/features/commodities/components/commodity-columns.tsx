"use client";

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
import { formatDate, formatKg, formatRs } from "@/lib/format";
import { categoryLabel, commodityText, unitShortText } from "../text";
import { type ChargeField, chargeFields, type Commodity } from "../types";
import { CommodityStatusBadge } from "./badges";
import type { CommodityStatusAction } from "./commodity-dialogs";
import { UrduName } from "./commodity-name";

const t = commodityText.list.columns;
const a = commodityText.actions;
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
function chargeValue(field: ChargeField, value: string): string {
  return field === "labourPerBag"
    ? formatRs(value)
    : commodityText.percent(value);
}

/** The overrides as text, e.g. ["Commission 2.50%"]; empty = shop default. */
export function chargeOverrides(commodity: Commodity): string[] {
  return chargeFields.flatMap((field) => {
    const value = commodity[field];
    return value === null
      ? []
      : [commodityText.list.charge(field, chargeValue(field, value))];
  });
}

function RowActions({
  commodity,
  actions,
}: {
  commodity: Commodity;
  actions: CommodityRowActions;
}) {
  if (!actions.canManage && !actions.canDelete) return null;
  return (
    <DataTableRowActions rowName={commodity.name}>
      {actions.canManage ? (
        <>
          <DropdownMenuItem onSelect={() => actions.onEdit(commodity)}>
            <Pencil aria-hidden />
            {a.edit}
          </DropdownMenuItem>
          {commodity.isActive ? (
            <DropdownMenuItem
              onSelect={() => actions.onStatus(commodity, "deactivate")}
            >
              <CircleOff aria-hidden />
              {a.deactivate}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => actions.onStatus(commodity, "activate")}
            >
              <CircleCheck aria-hidden />
              {a.activate}
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
            {a.delete}
          </DropdownMenuItem>
        </>
      ) : null}
    </DataTableRowActions>
  );
}

const none = (
  <span className="text-muted-foreground">{commodityText.none}</span>
);

/** Columns of the commodities list; only name and added date sort (server-side). */
export function commodityColumns(
  actions: CommodityRowActions,
): DataTableColumn<Commodity>[] {
  return col.columns([
    col.accessor("name", {
      header: t.name,
      meta: { label: t.name },
      cell: ({ row }) =>
        actions.canManage ? (
          <button
            type="button"
            onClick={() => actions.onEdit(row.original)}
            aria-label={a.editName(row.original.name)}
            className="text-foreground focus-visible:ring-ring/50 w-fit rounded-sm text-start font-semibold outline-none hover:underline focus-visible:ring-3"
          >
            <TraderName name={row.original.name} />
          </button>
        ) : (
          <TraderName name={row.original.name} className="font-semibold" />
        ),
    }),
    col.accessor("nameUr", {
      header: t.nameUr,
      enableSorting: false,
      meta: { label: t.nameUr },
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <UrduName name={value} className="text-base" /> : none;
      },
    }),
    col.accessor("category", {
      header: t.category,
      enableSorting: false,
      meta: {
        label: t.category,
        exportValue: (row: Commodity) =>
          row.category ? categoryLabel(row.category) : "",
      },
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <bdi dir="auto">{categoryLabel(value)}</bdi> : none;
      },
    }),
    col.accessor("defaultUnit", {
      header: t.defaultUnit,
      enableSorting: false,
      meta: {
        label: t.defaultUnit,
        exportValue: (row: Commodity) => unitShortText[row.defaultUnit],
      },
      cell: ({ row }) => unitShortText[row.original.defaultUnit],
    }),
    col.accessor("bagWeightKg", {
      header: t.bagWeight,
      enableSorting: false,
      meta: {
        align: "end",
        label: t.bagWeight,
        exportValue: (row: Commodity) => formatKg(row.bagWeightKg),
      },
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? (
          <span dir="ltr" className="tabular-nums">
            {formatKg(value)}
          </span>
        ) : (
          none
        );
      },
    }),
    col.display({
      id: "charges",
      header: t.charges,
      enableSorting: false,
      meta: {
        label: t.charges,
        exportValue: (row: Commodity) => {
          const overrides = chargeOverrides(row);
          return overrides.length > 0
            ? overrides.join(", ")
            : commodityText.list.shopDefault;
        },
      },
      cell: ({ row }) => {
        const overrides = chargeOverrides(row.original);
        return overrides.length > 0 ? (
          <ul className="flex flex-col text-[13px] tabular-nums">
            {overrides.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">
            {commodityText.list.shopDefault}
          </span>
        );
      },
    }),
    col.accessor("isActive", {
      id: "status",
      header: t.status,
      enableSorting: false,
      meta: {
        label: t.status,
        exportValue: (row: Commodity) =>
          row.isActive ? commodityText.active : commodityText.inactive,
      },
      cell: ({ getValue }) => <CommodityStatusBadge active={getValue()} />,
    }),
    col.accessor("createdAt", {
      header: t.added,
      sortDescFirst: true,
      meta: {
        label: t.added,
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
