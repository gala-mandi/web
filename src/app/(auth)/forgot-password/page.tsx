import { pageMetadata } from "@/i18n/metadata";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordFlow } from "@/features/auth/components/forgot-password-flow";

export const generateMetadata = pageMetadata("auth.meta.forgotPassword");

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordFlow />
    </AuthShell>
  );
}
