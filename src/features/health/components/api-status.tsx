"use client";

import { useHealth } from "../hooks";

const text = {
  checking: "Checking API…",
  up: "API connected",
  down: "API unreachable",
};

export function ApiStatus() {
  const { isPending, isError } = useHealth();

  const label = isPending ? text.checking : isError ? text.down : text.up;
  const color = isPending
    ? "bg-muted-foreground"
    : isError
      ? "bg-destructive"
      : "bg-success";

  return (
    <p role="status" className="flex items-center gap-2 text-sm">
      <span aria-hidden className={`size-2 rounded-full ${color}`} />
      {label}
    </p>
  );
}
