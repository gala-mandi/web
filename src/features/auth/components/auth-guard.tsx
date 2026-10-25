"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { ensureSession } from "@/lib/api";
import { handleAuthFailure } from "@/lib/auth-session";
import { isRedirecting } from "@/lib/navigation";
import { useSessionStore } from "@/stores/session";
import { guardText } from "../text";

/**
 * Protected pages render only with a session. Without an access token (new
 * tab, reload) it calls `POST /auth/refresh` once; on failure it goes to
 * login. Users who must change their password are sent to `/change-password`.
 */
export function AuthGuard({
  children,
  allowPasswordChange = false,
}: {
  children: ReactNode;
  allowPasswordChange?: boolean;
}) {
  const router = useRouter();
  const token = useSessionStore((s) => s.accessToken);
  const user = useSessionStore((s) => s.user);
  const mustChange = Boolean(user?.mustChangePassword) && !allowPasswordChange;

  useEffect(() => {
    if (token || isRedirecting()) return;
    ensureSession().catch(handleAuthFailure);
  }, [token]);

  useEffect(() => {
    if (mustChange) router.replace("/change-password");
  }, [mustChange, router]);

  if (!token || !user || mustChange) return <FullPageLoading />;
  return children;
}

export function FullPageLoading({
  label = guardText.loading,
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      className="bg-background text-muted-foreground flex min-h-screen flex-1 items-center justify-center gap-3 text-sm"
    >
      <Loader2 aria-hidden className="text-primary size-5 animate-spin" />
      {label}
    </div>
  );
}
