import { purchaseRoutes, saleRoutes } from "@/lib/routes";
import type { LedgerEntry } from "./types";

/** Which source pages the user may open (`purchase.view`, `sale.view`). */
export interface SourceAccess {
  purchases: boolean;
  sales: boolean;
}

/**
 * A reversal keeps the cancelled document's id but not its type; the
 * server's narration names it ("Purchase PUR-… cancelled", "Sale SAL-…
 * edited"). "Opening balance corrected" and anything else stays unlinked.
 */
function reversedType(narration: string | null): "purchase" | "sale" | null {
  if (!narration) return null;
  if (/^(Purchase|Paid on purchase) /.test(narration)) return "purchase";
  if (/^(Sale|Received on sale) /.test(narration)) return "sale";
  return null;
}

/**
 * The page of the document behind a khata line, or null. Purchases and
 * sales (and their reversals) open their bill; payments and receipts have
 * no page yet (Payments tickets), opening and adjustment lines have none.
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
      : entry.sourceType;
  if (type === "purchase" && access.purchases)
    return purchaseRoutes.detail(sourceId);
  if (type === "sale" && access.sales) return saleRoutes.detail(sourceId);
  return null;
}
