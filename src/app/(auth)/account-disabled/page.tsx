import { pageMetadata } from "@/i18n/metadata";
import { AuthShell } from "@/components/auth-shell";
import { AccountDisabled } from "@/features/auth/components/blocked-screens";

export const generateMetadata = pageMetadata("auth.meta.accountDisabled");

export default function AccountDisabledPage() {
  return (
    <AuthShell>
      <AccountDisabled />
    </AuthShell>
  );
}
