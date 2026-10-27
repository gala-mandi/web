import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AuthGuard,
  FullPageLoading,
} from "@/features/auth/components/auth-guard";
import { LandingRedirect } from "@/features/panel/components/landing-redirect";

export const metadata: Metadata = { title: "Galla Mandi" };

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

async function RedirectWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/home">["searchParams"];
}) {
  const params = await searchParams;
  return <LandingRedirect next={first(params.next)} />;
}

/**
 * `/home`: where `/login` sends a signed-in user (see `proxy.ts`). The proxy
 * can't see permissions, so the landing page (`/dashboard`, or `/rates` for an
 * operator) is picked here once the session is restored.
 */
export default function HomeRedirectPage({ searchParams }: PageProps<"/home">) {
  return (
    <AuthGuard>
      <Suspense fallback={<FullPageLoading />}>
        <RedirectWithParams searchParams={searchParams} />
      </Suspense>
    </AuthGuard>
  );
}
