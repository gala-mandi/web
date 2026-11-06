import { z } from "zod";
import type { CommodityLookupItem } from "@/features/commodities/types";
import {
  checkItem,
  emptyItem,
  isBlankItem,
  itemFormShape,
  MAX_ITEMS,
  type PurchaseItemFormValues,
  toItemFormField,
  toItemFormValues,
  toItemInput,
  type WeightUnit,
  type PurchasesTranslator,
} from "@/features/purchases/schemas";
import type { TraderLookupItem } from "@/features/traders/types";
import type { Translator } from "@/i18n/types";
import type { CreateSaleInput, Sale, SaleItemInput } from "./types";

/** Messages come from the `sales` messages of the interface language. */
export type SalesTranslator = Translator<"sales">;
const MAX_NOTES = 1000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The kissan's lot a saved line was sold from (not picked on this form). */
export interface SaleLot {
  purchaseItemId: string;
  /** The line's commodity when it was saved: the lot is of this one. */
  commodityId: string;
}

/** A purchase item row, plus the lot an edited line keeps. */
export interface SaleItemFormValues extends PurchaseItemFormValues {
  lot: SaleLot | null;
}

export interface SaleFormValues {
  /** YYYY-MM-DD, Asia/Karachi. */
  saleDate: string;
  buyer: TraderLookupItem | null;
  notes: string;
  items: SaleItemFormValues[];
}

export function emptySaleItem(weightUnit?: WeightUnit): SaleItemFormValues {
  return { ...emptyItem(weightUnit), lot: null };
}

export function emptySaleValues(today: string): SaleFormValues {
  return { saleDate: today, buyer: null, notes: "", items: [emptySaleItem()] };
}

/** The form's schema; `today` (Asia/Karachi) is the latest date allowed. */
export function saleFormSchema(
  today: string,
  t: SalesTranslator,
  tp: PurchasesTranslator,
) {
  // The item rows check like a purchase's (same words).
  const itemSchema = z
    .object({ ...itemFormShape, lot: z.custom<SaleLot | null>() })
    .superRefine(checkItem(tp));
  return z.object({
    saleDate: z
      .string()
      .trim()
      .regex(DATE, t("errors.dateRequired"))
      .refine((v) => v <= today, t("errors.dateInFuture")),
    buyer: z
      .custom<TraderLookupItem | null>()
      .refine(Boolean, t("errors.buyerRequired")),
    notes: z.string().max(MAX_NOTES, t("errors.notesTooLong")),
    items: z
      .array(itemSchema)
      .refine(
        (items) => items.some((item) => !isBlankItem(item)),
        t("errors.itemsRequired"),
      )
      .refine(
        (items) =>
          items.filter((item) => !isBlankItem(item)).length <= MAX_ITEMS,
        t("errors.tooManyItems"),
      ),
  });
}

/** A row as sent; a saved lot goes along while its commodity is unchanged. */
function toSaleItemInput(item: SaleItemFormValues): SaleItemInput {
  const input: SaleItemInput = toItemInput(item);
  if (item.lot && item.lot.commodityId === item.commodity?.id) {
    input.purchaseItemId = item.lot.purchaseItemId;
  }
  return input;
}

/**
 * The request body, without blank rows. `rowIndexes[i]` is the form row of
 * the i-th item sent, so `items.1.weightKg` from the server lands on its row.
 * No `charges` and no `receivedAmount`: the server uses the commodity's or
 * shop's rates, and an edit keeps what the bill has.
 */
export function toSaleInput(values: SaleFormValues): {
  input: CreateSaleInput;
  rowIndexes: number[];
} {
  const rowIndexes: number[] = [];
  const items: SaleItemInput[] = [];
  values.items.forEach((item, index) => {
    if (isBlankItem(item)) return;
    rowIndexes.push(index);
    items.push(toSaleItemInput(item));
  });
  const notes = values.notes.trim();
  return {
    input: {
      buyerId: values.buyer?.id ?? "",
      saleDate: values.saleDate,
      items,
      notes: notes || null,
    },
    rowIndexes,
  };
}

/** Server field → form field. */
const headerFields: Record<string, "buyer" | "saleDate" | "notes"> = {
  buyerId: "buyer",
  saleDate: "saleDate",
  notes: "notes",
};

/**
 * Where a server field error goes: `buyerId` (also the credit-limit block)
 * → `buyer`, `items.1.weightKg` → its row's weight, `items.1.purchaseItemId`
 * (the lot) → its row's commodity. Null for errors no field shows.
 */
export function toSaleFormField(
  field: string,
  rowIndexes: readonly number[],
): string | null {
  return (
    headerFields[field] ??
    toItemFormField(field, rowIndexes, { purchaseItemId: "commodity" })
  );
}

/** A saved sale as form values (edit): weights in kg, lots kept. */
export function toSaleFormValues(
  sale: Sale,
  charges: CommodityLookupItem["charges"],
): SaleFormValues {
  return {
    saleDate: sale.saleDate,
    buyer: {
      id: sale.buyer.id,
      type: "beopari",
      name: sale.buyer.name,
      fatherName: null,
      phone: null,
      village: null,
    },
    notes: sale.notes ?? "",
    items: sale.items.map((item) => ({
      ...toItemFormValues(item, charges),
      lot: item.purchaseItemId
        ? { purchaseItemId: item.purchaseItemId, commodityId: item.commodityId }
        : null,
    })),
  };
}
