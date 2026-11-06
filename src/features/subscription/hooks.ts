import { useQuery } from "@tanstack/react-query";
import { type Permission, useCan } from "@/lib/can";
import { useSessionStore } from "@/stores/session";
import { getSubscription } from "./api";
import { subscriptionKeys } from "./keys";

/**
 * The shop's plan and access state. A minute old is fresh enough; it is
 * refreshed when a write comes back `SUBSCRIPTION_READ_ONLY` and when the
 * window gets focus again (e.g. the next morning).
 */
export function useSubscription() {
  const hasShop = useSessionStore((s) => Boolean(s.user?.tenantId));
  return useQuery({
    queryKey: subscriptionKeys.all,
    queryFn: ({ signal }) => getSubscription(signal),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    enabled: hasShop,
  });
}

/** True once the plan and its grace period are over (view and print only). */
export function useReadOnly(): boolean {
  return useSubscription().data?.state === "read_only";
}

/**
 * `useCan` for buttons that change data (create, edit, cancel): false in
 * read-only mode, so they hide. The server refuses those writes anyway.
 */
export function useCanWrite(permission: Permission): boolean {
  const allowed = useCan(permission);
  const readOnly = useReadOnly();
  return allowed && !readOnly;
}
