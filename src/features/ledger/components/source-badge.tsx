import { PenLine, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sourceTypeText } from "../text";
import type { SourceType } from "../types";

const tone: Record<SourceType, string> = {
  opening: "bg-surface-muted text-muted-foreground",
  purchase: "bg-secondary text-secondary-foreground",
  sale: "bg-secondary text-secondary-foreground",
  payment: "bg-notice-soft text-notice",
  receipt: "bg-notice-soft text-notice",
  // The owner's manual corrections stand out from every other line.
  adjustment: "border-warning/50 bg-warning-soft text-warning",
  reversal: "bg-surface-muted text-muted-foreground",
};

/** What wrote a khata line; the word is always shown, not only the colour. */
export function SourceBadge({ type }: { type: SourceType }) {
  const Icon =
    type === "adjustment" ? PenLine : type === "reversal" ? Undo2 : null;
  return (
    <Badge
      variant="outline"
      data-source={type}
      className={cn(
        "font-semibold",
        type === "adjustment" ? "" : "border-transparent",
        tone[type],
      )}
    >
      {Icon ? <Icon aria-hidden /> : null}
      {sourceTypeText[type]}
    </Badge>
  );
}
