import type { ShopSubscription, SubscriptionView } from "./types";

export const TODAY = "2026-11-07";

export function subscriptionView(
  overrides: Partial<SubscriptionView> = {},
): SubscriptionView {
  return {
    id: "s1",
    plan: {
      id: "p-basic",
      name: "Basic",
      maxUsers: 5,
      maxBranches: 1,
      priceMonthly: "2500.00",
    },
    startsOn: "2026-10-20",
    endsOn: "2026-12-20",
    graceDays: 7,
    graceEndsOn: "2026-12-27",
    status: "active",
    state: "active",
    daysLeft: 43,
    graceDaysLeft: 50,
    usersUsed: 3,
    ...overrides,
  };
}

const trialPlan = {
  id: "p-trial",
  name: "Trial",
  maxUsers: 3,
  maxBranches: 1,
  priceMonthly: "0.00",
};

/** The four banner states of the ticket, plus a quiet paid plan. */
export const shopStates = {
  trial: {
    today: TODAY,
    state: "active",
    subscription: subscriptionView({
      plan: trialPlan,
      startsOn: "2026-11-01",
      endsOn: "2026-11-15",
      graceEndsOn: "2026-11-22",
      daysLeft: 8,
      graceDaysLeft: 15,
    }),
  },
  expiring: {
    today: TODAY,
    state: "active",
    subscription: subscriptionView({
      endsOn: "2026-11-10",
      graceEndsOn: "2026-11-17",
      daysLeft: 3,
      graceDaysLeft: 10,
    }),
  },
  grace: {
    today: TODAY,
    state: "grace",
    subscription: subscriptionView({
      endsOn: "2026-11-04",
      graceEndsOn: "2026-11-11",
      status: "expired",
      state: "grace",
      daysLeft: 0,
      graceDaysLeft: 4,
    }),
  },
  readOnly: {
    today: TODAY,
    state: "read_only",
    subscription: subscriptionView({
      plan: trialPlan,
      endsOn: "2026-10-28",
      graceEndsOn: "2026-11-04",
      status: "expired",
      state: "read_only",
      daysLeft: 0,
      graceDaysLeft: 0,
    }),
  },
  quiet: { today: TODAY, state: "active", subscription: subscriptionView() },
} satisfies Record<string, ShopSubscription>;
