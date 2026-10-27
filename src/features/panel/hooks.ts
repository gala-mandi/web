import type { QueryClient } from "@tanstack/react-query";
import { authKeys, useMe } from "@/features/auth/hooks";
import type { Tenant } from "@/features/auth/types";
import { selectTenant, useSessionStore } from "@/stores/session";

/** The shop name and logo come from this query (`GET /auth/me` → `tenant`). */
export const shopInfoKey = authKeys.me;

/**
 * The signed-in user's shop for the header. Read from the `/auth/me` query, so
 * refetching it (`refreshShopInfo`) updates the header without a new login.
 * Until the first answer it shows the shop from the login/refresh response.
 */
export function useShopInfo(): { shop: Tenant | null; isLoading: boolean } {
  const me = useMe();
  const sessionShop = useSessionStore(selectTenant);
  if (me.data) return { shop: me.data.tenant, isLoading: false };
  return { shop: sessionShop, isLoading: me.isPending && !sessionShop };
}

/**
 * Call after the shop's name or logo changed (e.g. from Settings): refetches
 * `/auth/me`, and the header shows the new values.
 *
 * @example await refreshShopInfo(useQueryClient())
 */
export function refreshShopInfo(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: shopInfoKey() });
}
