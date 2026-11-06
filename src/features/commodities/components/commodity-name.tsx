import { useLocale } from "next-intl";
import { TraderName } from "@/features/traders/components/trader-name";
import { cn } from "@/lib/utils";

/**
 * A commodity's Urdu name: `dir="auto"` keeps it right to left inside
 * English text, and it gets the Nastaliq font with the line height it needs.
 */
export function UrduName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <bdi
      dir="auto"
      lang="ur"
      className={cn("font-urdu leading-loose", className)}
    >
      {name}
    </bdi>
  );
}

/**
 * English name with the Urdu name beside it ("Gandum گندم"). The English
 * name may itself be typed in Urdu, so it picks its own font too. On the
 * Urdu interface the Urdu name leads (when the shop entered one).
 */
export function CommodityName({
  name,
  nameUr,
  className,
}: {
  name: string;
  nameUr: string | null;
  className?: string;
}) {
  const urduFirst = useLocale() === "ur" && Boolean(nameUr);
  if (urduFirst && nameUr) {
    return (
      <span className={cn("flex min-w-0 items-baseline gap-2", className)}>
        <UrduName name={nameUr} className="truncate font-semibold" />
        <TraderName name={name} className="text-muted-foreground truncate" />
      </span>
    );
  }
  return (
    <span className={cn("flex min-w-0 items-baseline gap-2", className)}>
      <TraderName name={name} className="truncate font-semibold" />
      {nameUr ? (
        <UrduName name={nameUr} className="text-muted-foreground truncate" />
      ) : null}
    </span>
  );
}
