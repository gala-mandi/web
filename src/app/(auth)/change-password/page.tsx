import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const metadata: Metadata = { title: "Change password — Galla Mandi" };

export default function ChangePasswordPage() {
  return (
    <AuthGuard allowPasswordChange>
      <AuthShell>
        <ChangePasswordForm />
      </AuthShell>
    </AuthGuard>
  );
}
