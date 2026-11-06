/** Kept apart from hooks.ts so `lib/api.ts` can refresh it without a cycle. */
export const subscriptionKeys = {
  all: ["subscription"] as const,
};

/** Error code of a write refused because the plan has run out. */
export const READ_ONLY_CODE = "SUBSCRIPTION_READ_ONLY";
/** Error code of an invite refused because the plan is full. */
export const USER_LIMIT_CODE = "PLAN_USER_LIMIT";
