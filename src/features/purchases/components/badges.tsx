import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { purchaseStatusText } from "../text";
import type { PurchaseStatus } from "../types";

const tone: Record<PurchaseStatus, string> = {
  draft: "bg-surface-muted text-muted-foreground",
  posted: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

/** The word is always shown, not only the colour. */
export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return (
    <Badge
      variant="outline"
      data-status={status}
      className={cn("border-transparent font-semibold", tone[status])}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {purchaseStatusText[status]}
    </Badge>
  );
}
