import { Skeleton } from "@/components/ui/skeleton";
import { panelText } from "../text";

/** Loading skeleton for a panel page (`loading.tsx`). */
export function PageSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col gap-6"
      data-testid="page-skeleton"
    >
      <span className="sr-only">{panelText.loading}</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="rounded-card h-28" />
        ))}
      </div>
      <Skeleton className="rounded-card h-64" />
    </div>
  );
}
