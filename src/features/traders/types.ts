/** Shapes of the traders API (see the traders contract, server#17). */

export const traderTypes = ["kissan", "beopari", "arhti"] as const;
/** kissan = farmer (sells grain), beopari = buyer, arhti = commission agent. */
export type TraderType = (typeof traderTypes)[number];

export const balanceTypes = ["debit", "credit"] as const;
/** Opening balance side: debit = the trader owes the shop, credit = the shop owes the trader. */
export type BalanceType = (typeof balanceTypes)[number];

export interface Trader {
  id: string;
  type: TraderType;
  /** 2..120 characters; Urdu allowed. */
  name: string;
  fatherName: string | null;
  /** Digits as the server stores them, e.g. "03001234567". */
  phone: string | null;
  /** "12345-1234567-1". */
  cnic: string | null;
  village: string | null;
  address: string | null;
  /** Rupees, e.g. "50000.00". */
  openingBalance: string;
  openingBalanceType: BalanceType;
  /** Rupees, or null for no limit. */
  creditLimit: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TraderDetail extends Trader {
  /**
   * Khata debit − credit, e.g. "-50000.00": positive = the trader owes the
   * shop (receivable), negative = the shop owes the trader (payable).
   */
  balance: string;
}

/** What `GET /traders/lookup` returns per trader (active traders only). */
export type TraderLookupItem = Pick<
  Trader,
  "id" | "type" | "name" | "fatherName" | "phone" | "village"
>;

export interface CreateTraderInput {
  type: TraderType;
  name: string;
  fatherName?: string | null;
  phone?: string | null;
  cnic?: string | null;
  village?: string | null;
  address?: string | null;
  /** Default "0". */
  openingBalance?: string;
  /** Default "debit". */
  openingBalanceType?: BalanceType;
  creditLimit?: string | null;
  /** Default true. */
  isActive?: boolean;
  notes?: string | null;
}

/** Any subset of the create fields; deactivate = `{ isActive: false }`. */
export type UpdateTraderInput = Partial<CreateTraderInput>;

export const traderSortFields = ["name", "createdAt"] as const;
export type TraderSortField = (typeof traderSortFields)[number];

/** Query of `GET /traders`. */
export interface TraderListQuery {
  page: number;
  limit: number;
  /** Name, or phone digits (3+). */
  search?: string;
  type?: TraderType;
  active?: boolean;
  sort?: TraderSortField | `-${TraderSortField}`;
}

/** Query of `GET /traders/lookup`. */
export interface TraderLookupQuery {
  q: string;
  type?: TraderType;
  limit?: number;
}
