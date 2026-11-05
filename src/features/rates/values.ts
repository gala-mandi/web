/**
 * Rupee strings and calendar dates as the rates API sends them. Compared and
 * stepped as text, so no float maths touches a rate.
 */

/** numeric(14,2): up to 12 digits before the point, as on the server. */
export const MONEY = /^\d{1,12}(\.\d{1,2})?$/;

/** "0040.5" → ["40", "50"]: integer without leading zeros, 2 decimals. */
function moneyParts(value: string): [string, string] {
  const [int, dec = ""] = value.trim().split(".");
  return [int.replace(/^0+(?=\d)/, ""), dec.padEnd(2, "0")];
}

/** -1, 0 or 1 for two well-formed rupee strings ("900.5" equals "900.50"). */
export function compareMoney(a: string, b: string): number {
  const [aInt, aDec] = moneyParts(a);
  const [bInt, bDec] = moneyParts(b);
  if (aInt.length !== bInt.length) return aInt.length < bInt.length ? -1 : 1;
  const left = aInt + aDec;
  const right = bInt + bDec;
  return left === right ? 0 : left < right ? -1 : 1;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A YYYY-MM-DD date that exists on the calendar. */
export function isCalendarDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** "2026-11-06" + 1 → "2026-11-07"; calendar days, no time zone involved. */
export function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/** Every date from `from` to `to`, both included. */
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}
