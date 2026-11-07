"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * An input with a unit beside the value ("Rs", "%", "kg"). Values with a
 * unit are typed left to right, so the box is LTR on both interfaces: the
 * Urdu "روپے" stays on the left, so read right to left it follows the
 * number ("15.00 روپے"), as in the rest of the Urdu screens.
 */
export function AdornedInput({
  prefix,
  suffix,
  className,
  ...props
}: ComponentProps<typeof Input> & { prefix?: string; suffix?: string }) {
  const before = prefix;
  const after = suffix;
  const unit =
    "text-muted-foreground pointer-events-none absolute inset-y-0 flex items-center text-sm";
  if (!before && !after) return <Input className={className} {...props} />;
  return (
    <div className="relative" dir="ltr">
      {before ? (
        <span aria-hidden className={cn(unit, "start-3")}>
          {before}
        </span>
      ) : null}
      <Input
        dir="ltr"
        {...props}
        className={cn(className, before && "ps-10", after && "pe-12")}
      />
      {after ? (
        <span aria-hidden className={cn(unit, "end-3")}>
          {after}
        </span>
      ) : null}
    </div>
  );
}
