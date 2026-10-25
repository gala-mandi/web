import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordFlow } from "@/features/auth/components/forgot-password-flow";

export const metadata: Metadata = { title: "Forgot password — Galla Mandi" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordFlow />
    </AuthShell>
  );
}
