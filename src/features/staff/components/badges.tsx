import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invitationStatusText, roleText, staffText } from "../text";
import type { InvitationStatus, StaffRole } from "../types";

const roleTone: Record<StaffRole, string> = {
  owner: "bg-primary/10 text-primary",
  manager: "bg-secondary text-secondary-foreground",
  operator: "bg-surface-muted text-foreground",
};

export function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <Badge
      variant="outline"
      data-role={role}
      className={cn("border-transparent font-semibold", roleTone[role])}
    >
      {roleText[role]}
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
  return (
    <Badge
      variant="outline"
      data-status={status}
      className={cn("border-transparent font-semibold", invitationTone[status])}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {invitationStatusText[status]}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
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
      {active ? staffText.table.active : staffText.table.disabled}
    </Badge>
  );
}
