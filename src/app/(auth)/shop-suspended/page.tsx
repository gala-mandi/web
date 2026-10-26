import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ShopSuspended } from "@/features/auth/components/blocked-screens";

export const metadata: Metadata = { title: "Shop suspended — Galla Mandi" };

export default function ShopSuspendedPage() {
  return (
    <AuthShell>
      <ShopSuspended />
    </AuthShell>
  );
}
