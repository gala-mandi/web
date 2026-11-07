import { pageMetadata } from "@/i18n/metadata";
import { AuthShell } from "@/components/auth-shell";
import { ShopSuspended } from "@/features/auth/components/blocked-screens";

export const generateMetadata = pageMetadata("auth.meta.shopSuspended");

export default function ShopSuspendedPage() {
  return (
    <AuthShell>
      <ShopSuspended />
    </AuthShell>
  );
}
