import { guardText } from "../text";

/** Placeholder card while a screen loads. */
export function AuthCardSkeleton({
  label = guardText.loading,
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="bg-card rounded-card shadow-card flex w-full max-w-[420px] flex-col gap-5 px-9 pt-10 pb-7"
    >
      <div className="bg-muted h-8 w-2/3 animate-pulse rounded-lg" />
      <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
      <div className="bg-muted h-[50px] animate-pulse rounded-field" />
      <div className="bg-muted h-[50px] animate-pulse rounded-field" />
      <div className="bg-muted rounded-button h-[52px] animate-pulse" />
    </div>
  );
}
