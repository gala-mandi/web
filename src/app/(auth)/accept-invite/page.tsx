import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { AuthCardSkeleton } from "@/features/auth/components/auth-card-skeleton";
import { AcceptInviteForm } from "@/features/staff/components/accept-invite-form";

export const metadata: Metadata = {
  title: "Accept invite — Galla Mandi",
  // The URL holds the invite token until the page removes it.
  referrer: "no-referrer",
};

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

async function AcceptWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/accept-invite">["searchParams"];
}) {
  const params = await searchParams;
  return <AcceptInviteForm token={first(params.token)} />;
}

/** 3.1 Accept staff invite (public). */
export default function AcceptInvitePage({
  searchParams,
}: PageProps<"/accept-invite">) {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <AcceptWithParams searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
