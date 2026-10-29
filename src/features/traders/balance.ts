/** Who owes whom, from the server's signed balance string. */
export type BalanceKind = "receivable" | "payable" | "settled";

/**
 * `"50000.00"` → receivable (the trader owes the shop), `"-50000.00"` →
 * payable (the shop owes the trader), `"0.00"` → settled. `amount` is the
 * balance without its sign, still a string: no float maths on money.
 */
export function readBalance(balance: string): {
  kind: BalanceKind;
  amount: string;
} {
  const value = balance.trim();
  const negative = value.startsWith("-");
  const amount = negative ? value.slice(1) : value;
  if (!/[1-9]/.test(amount)) return { kind: "settled", amount };
  return { kind: negative ? "payable" : "receivable", amount };
}
