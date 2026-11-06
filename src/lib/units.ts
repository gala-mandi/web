import Decimal from "decimal.js";

/**
 * Weights typed in maund or kg. Exact (`decimal.js`), strings in and out,
 * like the server's `src/common/units/units.ts`.
 */

/** 1 maund (mann) = 40 kg. */
export const MAUND_KG = "40";

/** A typed weight: digits with an optional decimal part. */
export const DECIMAL = /^\d+(\.\d+)?$/;

/** Kg are stored with 3 decimals (`numeric(12,3)`). */
const KG_DP = 3;

/** "25.25" maund → "1010.000" kg (3 decimals, half-up). Null if not a number. */
export function maundToKg(
  maund: string,
  maundKg: string = MAUND_KG,
): string | null {
  const value = maund.trim();
  if (!DECIMAL.test(value)) return null;
  return new Decimal(value)
    .times(maundKg)
    .toDecimalPlaces(KG_DP, Decimal.ROUND_HALF_UP)
    .toFixed(KG_DP);
}

/**
 * "1010" kg → "25.25" maund, exact, without trailing zeros (so switching back
 * gives the same kg). Null if not a number.
 */
export function kgToMaund(
  kg: string,
  maundKg: string = MAUND_KG,
): string | null {
  const value = kg.trim();
  if (!DECIMAL.test(value)) return null;
  return new Decimal(value).dividedBy(maundKg).toFixed();
}
