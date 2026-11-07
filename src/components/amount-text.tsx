"use client";

import { useLocale } from "next-intl";
import { unitWords } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A formatted rupee amount for a big figure: the unit word ("Rs" / "روپے")
 * is set smaller so the figure stays on one line in narrow cards, and the
 * text reads exactly as `formatRs` wrote it.
 */
export function AmountText({
  text,
  unitClassName,
}: {
  text: string;
  unitClassName?: string;
}) {
  const locale = useLocale();
  const word = unitWords[locale].rs;
  const unit = (
    <span className={cn("text-[0.6em] font-semibold", unitClassName)}>
      {word}
    </span>
  );
  if (locale === "ur" && text.endsWith(` ${word}`)) {
    return (
      <span className="whitespace-nowrap">
        {text.slice(0, -word.length - 1)} {unit}
      </span>
    );
  }
  const english = /^(-?)Rs (.*)$/.exec(text);
  if (locale === "en" && english) {
    return (
      <span className="whitespace-nowrap">
        {english[1]}
        {unit} {english[2]}
      </span>
    );
  }
  return <>{text}</>;
}
