import { cn } from "@/lib/utils";

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** Text with Urdu (Arabic script) in it gets the Nastaliq font. */
export function isUrdu(text: string | null | undefined): boolean {
  return Boolean(text && ARABIC_SCRIPT.test(text));
}

/**
 * A trader's (or father's) name typed in English or Urdu: `dir="auto"` lets
 * the browser lay out each name by its own script, and Urdu gets the
 * Nastaliq font with the line height it needs.
 */
export function TraderName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const urdu = isUrdu(name);
  return (
    <bdi
      dir="auto"
      lang={urdu ? "ur" : "en"}
      className={cn(urdu && "font-urdu leading-loose", className)}
    >
      {name}
    </bdi>
  );
}
