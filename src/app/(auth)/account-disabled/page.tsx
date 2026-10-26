import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { AccountDisabled } from "@/features/auth/components/blocked-screens";

export const metadata: Metadata = { title: "Account disabled — Galla Mandi" };

export default function AccountDisabledPage() {
  return (
    <AuthShell>
      <AccountDisabled />
    </AuthShell>
  );
}
