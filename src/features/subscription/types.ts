/** `GET /subscription`: the shop's plan and what it may do today. */

/**
 * `active` until the end date, `grace` for the grace days after it (full
 * access, warned), then `read_only` (view and print only).
 */
export type AccessState = "active" | "grace" | "read_only";

export interface SubscriptionView {
  id: string;
  plan: {
    id: string;
    name: string;
    maxUsers: number;
    maxBranches: number;
    priceMonthly: string;
  };
  /** Calendar days `YYYY-MM-DD`, Pakistan date. */
  startsOn: string;
  endsOn: string;
  graceDays: number;
  graceEndsOn: string;
  status: "active" | "expired" | "cancelled";
  state: AccessState;
  /** Days until `endsOn` (0 on the last day). */
  daysLeft: number;
  graceDaysLeft: number;
  /** Active users plus invites not yet accepted. */
  usersUsed: number;
}

export interface ShopSubscription {
  /** Today in Pakistan, the day the server worked the state out for. */
  today: string;
  state: AccessState;
  subscription: SubscriptionView | null;
}
