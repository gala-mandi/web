import { pageMetadata } from "@/i18n/metadata";
import { AuthShell } from "@/components/auth-shell";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const generateMetadata = pageMetadata("auth.meta.changePassword");

export default function ChangePasswordPage() {
  return (
    <AuthGuard allowPasswordChange>
      <AuthShell>
        <ChangePasswordForm />
      </AuthShell>
    </AuthGuard>
  );
}
