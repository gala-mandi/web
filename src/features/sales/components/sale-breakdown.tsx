import { useTranslations } from "next-intl";
import {
  BreakdownLine,
  rateText,
  signedRs,
} from "@/features/purchases/components/breakdown-lines";
import type { ChargeLine } from "@/lib/charges/calculate-transaction";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

export interface SaleBreakdownValues {
  grossAmount: string;
  charges: readonly ChargeLine[];
  totalCharges: string;
  rounding: string;
  netAmount: string;
  /** Shown only when above 0. */
  receivedAmount?: string;
}

/**
 * The sale parchi's sums: gross + each charge = total charges, then the
 * rounding line, so gross + charges + rounding = net (what the beopari
 * owes). Used by the live total on the form and by the saved sale.
 */
export function SaleBreakdownLines({
  values,
  className,
}: {
  values: SaleBreakdownValues;
  className?: string;
}) {
  const { formatRs } = useFormat();
  const tp = useTranslations("purchases");
  const t = useTranslations("sales");
  const received = values.receivedAmount && /[1-9]/.test(values.receivedAmount);
  return (
    <dl
      data-testid="sale-breakdown"
      className={cn("flex flex-col gap-1.5 text-sm", className)}
    >
      <BreakdownLine
        label={t("breakdown.gross")}
        value={formatRs(values.grossAmount)}
        strong
      />
      {values.charges.map((charge) => (
        <BreakdownLine
          key={`${charge.type}|${charge.basis}|${charge.value}`}
          label={t("breakdown.charge", {
            label: tp(`chargeTypes.${charge.type}`),
            basis: charge.basis,
            value:
              charge.basis === "percent"
                ? rateText(charge.value)
                : formatRs(charge.value),
          })}
          value={`+${formatRs(charge.amount)}`}
          muted
        />
      ))}
      <BreakdownLine
        label={t("breakdown.totalCharges")}
        value={`+${formatRs(values.totalCharges)}`}
        className="border-t pt-1.5"
      />
      <BreakdownLine
        label={t("breakdown.rounding")}
        value={signedRs(values.rounding, formatRs)}
        muted
      />
      <BreakdownLine
        label={t("breakdown.net")}
        value={formatRs(values.netAmount)}
        strong
        className="font-heading border-t pt-2 text-base"
        testId="sale-net"
      />
      {received ? (
        <BreakdownLine
          label={t("breakdown.received")}
          value={formatRs(values.receivedAmount)}
          muted
        />
      ) : null}
    </dl>
  );
}
