/** Shapes of the daily rates API (see the rates contract, server ticket 17). */

/** A rate is per maund or per kg. */
export const rateUnits = ["maund", "kg"] as const;
export type RateUnit = (typeof rateUnits)[number];

export interface Rate {
  id: string;
  commodityId: string;
  /** Asia/Karachi date, e.g. "2026-11-06". */
  rateDate: string;
  /** Rupees as strings, e.g. "4200.00". */
  minRate: string;
  maxRate: string;
  avgRate: string | null;
  rateUnit: RateUnit;
  createdAt: string;
  updatedAt: string;
}

/** One day's rates, in commodity name order. */
export interface DayRates {
  date: string;
  data: Rate[];
}

/** `GET /rates/today`: today (Asia/Karachi) plus yesterday's rates. */
export interface TodayRates extends DayRates {
  yesterday: DayRates;
}

/** One commodity's rate in `PUT /rates/:date`. */
export interface RateInput {
  commodityId: string;
  minRate: string;
  maxRate: string;
  /** null = not set. */
  avgRate?: string | null;
  /** Default "maund". */
  rateUnit?: RateUnit;
}

export interface SaveRatesInput {
  rates: RateInput[];
}

/** Query of `GET /rates` (from/to inclusive). */
export interface RateListQuery {
  page: number;
  /** 1..100 */
  limit: number;
  commodity?: string;
  from?: string;
  to?: string;
  sort?: "rateDate" | "-rateDate";
}
