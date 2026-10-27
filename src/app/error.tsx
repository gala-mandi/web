"use client";

import { useEffect } from "react";
import { ErrorState } from "@/features/panel/components/status-pages";

/** Error boundary for pages outside the panel (sign in, password pages). */
export default function RootError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <ErrorState retry={retry} />
      </div>
    </main>
  );
}
