/** Shapes of the shop settings API (`GET/PATCH /settings`, `POST /settings/logo`). */

export type WeightUnit = "kg" | "maund" | "bag";
export type Language = "en" | "ur";

export interface Settings {
  // Shop profile
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  logoUrl: string | null;
  // Parchi
  /** Name printed on the parchi; the shop name when empty. */
  displayName: string | null;
  parchiFooter: string | null;
  // Charges & commission: decimals as strings, never floats
  /** e.g. "2.50" */
  defaultCommissionPct: string;
  marketFeePct: string;
  /** Rupees, e.g. "15.00" */
  labourPerBag: string;
  // Units
  defaultUnit: WeightUnit;
  /** e.g. "40.000" */
  maundKg: string;
  language: Language;
  // Numbering
  billPrefix: string | null;
  /** YYYY-MM-DD */
  financialYearStart: string | null;
  updatedAt: string;
}

/** Only the fields that change. `logoUrl` can only be removed here. */
export type UpdateSettingsInput = Partial<
  Omit<Settings, "updatedAt" | "logoUrl">
> & { logoUrl?: null };
