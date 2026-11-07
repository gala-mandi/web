import { useTranslations } from "next-intl";
import { type BalanceKind, readBalance } from "@/features/traders/balance";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

/**
 * One colour per side everywhere in the ledger: green = Dr / receivable (the
 * trader owes the shop), red = Cr / payable (the shop owes the trader). The
 * words "Dr" / "Cr" always go with the colour.
 */
export const balanceTone = {
  receivable: "text-success",
  payable: "text-destructive",
  settled: "text-muted-foreground",
} as const satisfies Record<BalanceKind, string>;

export const sideTone = {
  debit: balanceTone.receivable,
  credit: balanceTone.payable,
} as const;

/** The side's short word (Dr / بنام) and its meaning, by message key. */
const sideLabel = {
  receivable: { short: "dr", long: "balance.receivable" },
  payable: { short: "cr", long: "balance.payable" },
  settled: null,
} as const;

export interface BalanceAmountProps {
  /** The server's signed balance (debit − credit), e.g. "-60000.00". */
  balance: string;
  /** Adds "They owe you" / "You owe them" under the amount. */
  showHint?: boolean;
  className?: string;
}

/**
 * A khata balance as non-technical users read it: the amount without its
 * sign, then Dr (they owe you) or Cr (you owe them), in that side's colour.
 */
export function BalanceAmount({
  balance,
  showHint = false,
  className,
}: BalanceAmountProps) {
  const { formatRs } = useFormat();
  const t = useTranslations("ledger");
  const { kind, amount } = readBalance(balance);
  const side = sideLabel[kind];
  return (
    <span
      data-kind={kind}
      className={cn("inline-flex flex-col", balanceTone[kind], className)}
    >
      <span className="font-semibold whitespace-nowrap tabular-nums">
        <span dir="auto">{formatRs(amount)}</span>
        {side ? (
          <>
            {" "}
            <abbr title={t(side.long)} className="no-underline">
              {t(side.short)}
            </abbr>
          </>
        ) : null}
      </span>
      {showHint ? (
        <span className="text-xs font-normal">{t(`balance.${kind}Hint`)}</span>
      ) : null}
    </span>
  );
}

/**
 * The Dr or Cr column of one line: the amount in its side's colour, or
 * nothing when that side is zero (every line has exactly one side).
 */
export function SideAmount({
  amount,
  side,
}: {
  amount: string;
  side: "debit" | "credit";
}) {
  const { formatRs } = useFormat();
  if (!/[1-9]/.test(amount)) return null;
  return (
    <span
      dir="auto"
      data-side={side}
      className={cn("font-semibold tabular-nums", sideTone[side])}
    >
      {formatRs(amount)}
    </span>
  );
}
