import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { commodityText } from "../text";

/** The word is always shown, not only the colour. */
export function CommodityStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      data-status={active ? "active" : "inactive"}
      className={cn(
        "border-transparent font-semibold",
        active
          ? "bg-success/10 text-success"
          : "bg-surface-muted text-muted-foreground",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {active ? commodityText.active : commodityText.inactive}
    </Badge>
  );
}
