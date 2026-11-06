import { paymentRoutes, purchaseRoutes, saleRoutes } from "@/lib/routes";
import type { LedgerEntry } from "./types";

/**
 * Which source pages the user may open (`purchase.view`, `sale.view`,
 * `payment.view`).
 */
export interface SourceAccess {
  purchases: boolean;
  sales: boolean;
  payments: boolean;
}

type Linked = "purchase" | "sale" | "payment";

/**
 * A reversal keeps the cancelled document's id but not its type; the
 * server's narration names it ("Purchase PUR-… cancelled", "Sale SAL-…
 * edited", "Payment PAY-… cancelled", "Receipt RCT-… cancelled").
 * "Opening balance corrected" and anything else stays unlinked.
 */
function reversedType(narration: string | null): Linked | null {
  if (!narration) return null;
  if (/^(Purchase|Paid on purchase) /.test(narration)) return "purchase";
  if (/^(Sale|Received on sale) /.test(narration)) return "sale";
  if (/^(Payment|Receipt) /.test(narration)) return "payment";
  return null;
}

/** Payments and receipts are both vouchers, on one page. */
function linkedType(type: LedgerEntry["sourceType"]): Linked | null {
  if (type === "purchase" || type === "sale") return type;
  if (type === "payment" || type === "receipt") return "payment";
  return null;
}

/**
 * The page of the document behind a khata line, or null. Purchases and
 * sales (and their reversals) open their bill, payments and receipts (and
 * their reversals) their voucher; opening and adjustment lines have none.
 */
export function sourceHref(
  entry: Pick<LedgerEntry, "sourceType" | "sourceId" | "narration">,
  access: SourceAccess,
): string | null {
  const { sourceId } = entry;
  if (!sourceId) return null;
  const type =
    entry.sourceType === "reversal"
      ? reversedType(entry.narration)
      : linkedType(entry.sourceType);
  if (type === "purchase" && access.purchases)
    return purchaseRoutes.detail(sourceId);
  if (type === "sale" && access.sales) return saleRoutes.detail(sourceId);
  if (type === "payment" && access.payments)
    return paymentRoutes.detail(sourceId);
  return null;
}
