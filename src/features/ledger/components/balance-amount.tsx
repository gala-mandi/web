import { type BalanceKind, readBalance } from "@/features/traders/balance";
import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ledgerText } from "../text";

const t = ledgerText;

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

const sideLabel = {
  receivable: { short: t.dr, long: t.balance.receivable },
  payable: { short: t.cr, long: t.balance.payable },
  settled: null,
} as const;

const hintText = {
  receivable: t.balance.receivableHint,
  payable: t.balance.payableHint,
  settled: t.balance.settledHint,
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
  const { kind, amount } = readBalance(balance);
  const side = sideLabel[kind];
  return (
    <span
      data-kind={kind}
      className={cn("inline-flex flex-col", balanceTone[kind], className)}
    >
      <span className="font-semibold whitespace-nowrap tabular-nums">
        <span dir="ltr">{formatRs(amount)}</span>
        {side ? (
          <>
            {" "}
            <abbr title={side.long} className="no-underline">
              {side.short}
            </abbr>
          </>
        ) : null}
      </span>
      {showHint ? (
        <span className="text-xs font-normal">{hintText[kind]}</span>
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
  if (!/[1-9]/.test(amount)) return null;
  return (
    <span
      dir="ltr"
      data-side={side}
      className={cn("font-semibold tabular-nums", sideTone[side])}
    >
      {formatRs(amount)}
    </span>
  );
}
