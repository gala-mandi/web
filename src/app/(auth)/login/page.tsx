import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { AuthCardSkeleton } from "@/features/auth/components/auth-card-skeleton";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in — Galla Mandi" };

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

async function LoginWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  return <LoginForm reason={first(params.reason)} next={first(params.next)} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginWithParams searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
