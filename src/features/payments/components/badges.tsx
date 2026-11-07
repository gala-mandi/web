import { useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentDirection } from "../types";

const tone: Record<PaymentDirection, string> = {
  paid: "bg-warning-soft text-warning",
  received: "bg-success/10 text-success",
};

/**
 * Payment (money out, to a kissan) or receipt (money in, from a beopari);
 * the word is always shown, not only the colour.
 */
export function DirectionBadge({ direction }: { direction: PaymentDirection }) {
  const t = useTranslations("payments");
  const Icon = direction === "paid" ? ArrowUpRight : ArrowDownLeft;
  return (
    <Badge
      variant="outline"
      data-direction={direction}
      className={cn("border-transparent font-semibold", tone[direction])}
    >
      <Icon aria-hidden />
      {t(`directions.${direction}`)}
    </Badge>
  );
}
