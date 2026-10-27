"use client";

import { useEffect } from "react";
import { ErrorState } from "@/features/panel/components/status-pages";

/** Error boundary for panel pages; the sidebar and header stay usable. */
export default function PanelError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : "";

  return <ErrorState retry={retry} digest={digest || undefined} />;
}
