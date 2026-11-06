import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvitationStatus, StaffRole } from "../types";

const roleTone: Record<StaffRole, string> = {
  owner: "bg-primary/10 text-primary",
  manager: "bg-secondary text-secondary-foreground",
  operator: "bg-surface-muted text-foreground",
};

export function RoleBadge({ role }: { role: StaffRole }) {
  const t = useTranslations("staff");
  return (
    <Badge
      variant="outline"
      data-role={role}
      className={cn("border-transparent font-semibold", roleTone[role])}
    >
      {t(`roles.${role}`)}
    </Badge>
  );
}

const invitationTone: Record<InvitationStatus, string> = {
  pending: "bg-warning-soft text-warning",
  accepted: "bg-success/10 text-success",
  cancelled: "border-border text-muted-foreground bg-transparent",
  expired: "bg-destructive/10 text-destructive",
};

/** The word is always shown, not only the colour. */
export function InvitationStatusBadge({
  status,
}: {
  status: InvitationStatus;
}) {
  const t = useTranslations("staff");
  return (
    <Badge
      variant="outline"
      data-status={status}
      className={cn("border-transparent font-semibold", invitationTone[status])}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(`invitationStatus.${status}`)}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  const t = useTranslations("staff");
  return (
    <Badge
      variant="outline"
      data-status={active ? "active" : "disabled"}
      className={cn(
        "border-transparent font-semibold",
        active
          ? "bg-success/10 text-success"
          : "bg-destructive/10 text-destructive",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {active ? t("table.active") : t("table.disabled")}
    </Badge>
  );
}
