import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { traderText, traderTypeText } from "../text";
import type { TraderType } from "../types";

const typeTone: Record<TraderType, string> = {
  kissan: "bg-success/10 text-success",
  beopari: "bg-primary/10 text-primary",
  arhti: "bg-secondary text-secondary-foreground",
};

export function TraderTypeBadge({ type }: { type: TraderType }) {
  return (
    <Badge
      variant="outline"
      data-type={type}
      className={cn("border-transparent font-semibold", typeTone[type])}
    >
      {traderTypeText[type]}
    </Badge>
  );
}

/** The word is always shown, not only the colour. */
export function TraderStatusBadge({ active }: { active: boolean }) {
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
      {active ? traderText.active : traderText.inactive}
    </Badge>
  );
}
