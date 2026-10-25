import { useMutation, useQuery } from "@tanstack/react-query";
import { clearSession } from "@/lib/auth-session";
import { hardRedirect } from "@/lib/navigation";
import { useSessionStore } from "@/stores/session";
import { getMe, logout, logoutAll } from "./api";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

/** The signed-in user from `GET /auth/me`. */
export function useMe() {
  const hasToken = useSessionStore((s) => s.accessToken !== null);
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: getMe,
    enabled: hasToken,
  });
}

function endSession() {
  clearSession();
  hardRedirect("/login");
}

/** `POST /auth/logout`; the local session is cleared even if the call fails. */
export function useLogout() {
  return useMutation({
    mutationFn: logout,
    onSettled: endSession,
  });
}

/**
 * `POST /auth/logout-all`: ends every session of this user. Only leaves the
 * page when the server confirmed, so a failure can be shown and retried.
 */
export function useLogoutAll() {
  return useMutation({
    mutationFn: logoutAll,
    onSuccess: endSession,
  });
}
