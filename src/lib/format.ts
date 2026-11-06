/** Shop time zone: the server stores UTC, the UI shows Pakistan time. */
export const SHOP_TIME_ZONE = "Asia/Karachi";

const dateTime = new Intl.DateTimeFormat("en-PK", {
  timeZone: SHOP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat("en-PK", {
  timeZone: SHOP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar day in Asia/Karachi, e.g. `2026-11-06`. */
export function karachiToday(now: Date = new Date()): string {
  return isoDay.format(now);
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `12 Oct 2026, 3:05 pm` in Asia/Karachi. */
export function formatDateTime(value: string | Date): string {
  const date = toDate(value);
  return date ? dateTime.format(date) : "";
}

/** `12 Oct 2026` in Asia/Karachi. */
export function formatDate(value: string | Date): string {
  const date = toDate(value);
  return date ? dateOnly.format(date) : "";
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** `in 2 days`, `3 hours ago`, `now`. */
export function formatRelative(
  value: string | Date,
  now: number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return "";
  const diff = date.getTime() - now;
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms)
      return relative.format(Math.round(diff / ms), unit);
  }
  return relative.format(0, "minute");
}

/** "12.500" → 12500 (thousandths), without float rounding. Null if not a decimal. */
function toThousandths(value: string | number): number | null {
  const match = /^(\d+)(?:\.(\d{0,3})\d*)?$/.exec(String(value).trim());
  if (!match) return null;
  return Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
}

const kgNumber = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 3 });

/**
 * A weight in kg as maund + kg, e.g. `12 mn 15 kg`, `25 mn`, `15 kg`.
 * `maundKg` is the shop's setting (40 unless the owner changed it).
 */
export function formatMaund(
  kg: string | number,
  maundKg: string | number = "40",
): string {
  const total = toThousandths(kg);
  const perMaund = toThousandths(maundKg);
  if (total === null || !perMaund) return "";
  const maunds = Math.floor(total / perMaund);
  const rest = total - maunds * perMaund;
  const kgPart = `${kgNumber.format(rest / 1000)} kg`;
  if (maunds === 0) return kgPart;
  const mnPart = `${kgNumber.format(maunds)} mn`;
  return rest === 0 ? mnPart : `${mnPart} ${kgPart}`;
}

/**
 * Rupees as the server sends them (a decimal string, e.g. `"50000.5"`) →
 * `Rs 50,000.50`; a negative amount gets a leading minus (`-Rs 1,200.00`).
 * The integer and decimal parts are formatted as text, so no float maths
 * touches the amount; more than 2 decimals are cut, never rounded. Returns ""
 * for anything that isn't a plain decimal.
 */
export function formatRs(value: string | null | undefined): string {
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec((value ?? "").trim());
  if (!match) return "";
  const [, sign, rawInt, rawDec = ""] = match;
  const int = rawInt.replace(/^0+(?=\d)/, "");
  const dec = rawDec.padEnd(2, "0").slice(0, 2);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const negative = sign === "-" && /[1-9]/.test(int + dec);
  return `${negative ? "-" : ""}Rs ${grouped}.${dec}`;
}

/**
 * A weight in kg as the server sends it (a decimal string, e.g. `"1250.500"`)
 * → `1,250.5 kg`: trailing zeros go, at most 3 decimals (cut, never rounded),
 * no float maths. Returns "" for anything that isn't a plain decimal.
 */
export function formatKg(value: string | null | undefined): string {
  const match = /^(\d+)(?:\.(\d*))?$/.exec((value ?? "").trim());
  if (!match) return "";
  const [, rawInt, rawDec = ""] = match;
  const int = rawInt.replace(/^0+(?=\d)/, "");
  const dec = rawDec.slice(0, 3).replace(/0+$/, "");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}${dec ? `.${dec}` : ""} kg`;
}
