import type { ChargeLine } from "@/lib/charges/calculate-transaction";
import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { purchaseText } from "../text";

const t = purchaseText.breakdown;

export interface BreakdownValues {
  grossAmount: string;
  charges: readonly ChargeLine[];
  totalDeductions: string;
  rounding: string;
  netAmount: string;
  /** Shown only when above 0. */
  paidAmount?: string;
}

/** "2.00" → "2", "0.50" → "0.5": a charge rate as people say it. */
function rateText(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/** "-0.46" → "-Rs 0.46", "0.50" → "+Rs 0.50". */
function signedRs(value: string): string {
  const shown = formatRs(value);
  return value.startsWith("-") || !/[1-9]/.test(value) ? shown : `+${shown}`;
}

/**
 * The parchi's sums: gross − each deduction = total deductions, then the
 * rounding line, so gross − deductions + rounding = net. Used by the live
 * total on the form and by the saved (printable) purchase.
 */
export function BreakdownLines({
  values,
  className,
}: {
  values: BreakdownValues;
  className?: string;
}) {
  const paid = values.paidAmount && /[1-9]/.test(values.paidAmount);
  return (
    <dl
      data-testid="purchase-breakdown"
      className={cn("flex flex-col gap-1.5 text-sm", className)}
    >
      <Line label={t.gross} value={formatRs(values.grossAmount)} strong />
      {values.charges.map((charge) => (
        <Line
          key={`${charge.type}|${charge.basis}|${charge.value}`}
          label={t.charge(
            charge.type,
            charge.basis,
            charge.basis === "percent"
              ? rateText(charge.value)
              : formatRs(charge.value),
          )}
          value={`-${formatRs(charge.amount)}`}
          muted
        />
      ))}
      <Line
        label={t.totalDeductions}
        value={`-${formatRs(values.totalDeductions)}`}
        className="border-t pt-1.5"
      />
      <Line label={t.rounding} value={signedRs(values.rounding)} muted />
      <Line
        label={t.net}
        value={formatRs(values.netAmount)}
        strong
        className="font-heading border-t pt-2 text-base"
        testId="purchase-net"
      />
      {paid ? (
        <Line label={t.paid} value={formatRs(values.paidAmount)} muted />
      ) : null}
    </dl>
  );
}

function Line({
  label,
  value,
  strong,
  muted,
  className,
  testId,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        strong && "font-bold",
        muted && "text-muted-foreground",
        className,
      )}
    >
      <dt>{label}</dt>
      <dd data-testid={testId} dir="ltr" className="tabular-nums">
        {value}
      </dd>
    </div>
  );
}
