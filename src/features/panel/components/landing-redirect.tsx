"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoading } from "@/features/auth/components/auth-guard";
import { homePathFor } from "@/lib/auth-session";
import { safeNextPath } from "@/lib/navigation";
import { useSessionStore } from "@/stores/session";

/**
 * Sends the signed-in user to `?next=` (when they may open it) or to their
 * landing page. Rendered inside `AuthGuard`, so the user is known.
 */
export function LandingRedirect({ next }: { next: string | null }) {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);

  useEffect(() => {
    if (user) router.replace(homePathFor(user, safeNextPath(next)));
  }, [user, next, router]);

  return <FullPageLoading />;
}
