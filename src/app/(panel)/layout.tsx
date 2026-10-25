import { AuthGuard } from "@/features/auth/components/auth-guard";
import { PanelShell } from "@/features/panel/components/panel-shell";

export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard>
      <PanelShell>{children}</PanelShell>
    </AuthGuard>
  );
}
