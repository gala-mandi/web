import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: ReactNode;
  /** e.g. a button to create the first item or go back. */
  action?: ReactNode;
  /** Extra line above the title, such as an error code. */
  eyebrow?: string;
  role?: "status" | "alert";
  /** `h1` when the state is the whole page (404, 403, error). */
  headingLevel?: "h1" | "h2";
  className?: string;
}

/** Centred card for empty lists, 403, 404 and error states. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  eyebrow,
  role,
  headingLevel: Heading = "h2",
  className,
}: EmptyStateProps) {
  return (
    <section
      role={role}
      className={cn(
        "bg-card text-card-foreground rounded-card flex flex-col items-center gap-3 border px-6 py-12 text-center",
        className,
      )}
    >
      <div className="bg-secondary text-secondary-foreground flex size-14 items-center justify-center rounded-full">
        <Icon aria-hidden className="size-6" />
      </div>
      {eyebrow ? (
        <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
          {eyebrow}
        </p>
      ) : null}
      <Heading className="font-heading text-lg font-bold">{title}</Heading>
      {body ? (
        <p className="text-muted-foreground max-w-md text-sm/relaxed">{body}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  );
}
