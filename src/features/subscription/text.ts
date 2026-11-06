/** Words of the plan banner and read-only mode (kept out of logic for Urdu). */

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export const subscriptionText = {
  banner: {
    label: "Your plan",
    trial: (left: number, endsOn: string) =>
      left === 0
        ? `Your free trial ends today (${endsOn}).`
        : `Free trial: ${days(left)} left, until ${endsOn}.`,
    expiring: (plan: string, left: number, endsOn: string) =>
      left === 0
        ? `Your ${plan} plan ends today (${endsOn}).`
        : `Your ${plan} plan ends in ${days(left)}, on ${endsOn}.`,
    grace: (endsOn: string, left: number, graceEndsOn: string) =>
      left === 0
        ? `Your plan ended on ${endsOn}. Today is the last day of full access; from tomorrow the shop is read-only.`
        : `Your plan ended on ${endsOn}. Full access for ${days(left)} more, then read-only after ${graceEndsOn}.`,
    readOnly: (endsOn: string) =>
      `Your plan ended on ${endsOn}. The shop is read-only: you can view and print, but not add or change anything.`,
    renewOwner: "Contact Galla Mandi support to renew.",
    renewStaff: "Ask your shop owner to renew.",
    dismiss: "Hide for today",
  },
  notice: {
    badge: "Read-only",
    title: (shop: string | null) =>
      shop ? `${shop} is read-only` : "Your shop is read-only",
    body: (endsOn: string) =>
      `This shop’s plan ended on ${endsOn}. Your khata, traders and reports are safe — nothing has been deleted.`,
    ur: "پلان ختم ہو گیا ہے، آپ کا تمام ڈیٹا محفوظ ہے",
    points: [
      "You can still view and print every record",
      "Adding and changing entries is paused",
      "Everything unlocks the moment you renew",
    ],
    contact: "Contact Galla Mandi support to renew.",
    staff: "Staff? Ask your shop owner.",
    back: "Back",
  },
  toast: {
    readOnly:
      "Your plan has ended, so the shop is read-only. You can view and print; renew to add or change entries.",
  },
  limit: {
    title: "Your plan is full",
    body: (plan: string, max: number) =>
      `Your ${plan} plan allows ${max} users, counting the owner, staff and invites not yet accepted. Ask Galla Mandi support to upgrade your plan, or free a place by cancelling an invite or turning off a staff member.`,
    bodyUnknown:
      "Your plan has no room for more users. Ask Galla Mandi support to upgrade your plan, or free a place by cancelling an invite or turning off a staff member.",
    usage: (used: number, max: number, plan: string) =>
      `${used} of ${max} users on your ${plan} plan`,
  },
} as const;
