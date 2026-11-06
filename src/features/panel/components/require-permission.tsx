"use client";

import type { ReactNode } from "react";
import { useReadOnly } from "@/features/subscription/hooks";
import { ReadOnlyNotice } from "@/features/subscription/components/read-only-notice";
import { type Permission, useCan } from "@/lib/can";
import { ForbiddenState } from "./status-pages";

/** Read-only shops see screen 4.1 instead of a page that writes. */
function WriteGate({ children }: { children: ReactNode }) {
  return useReadOnly() ? <ReadOnlyNotice /> : children;
}

/**
 * Renders the page only when the server gave the user `permission`, otherwise
 * the 403 state inside the layout. `write` marks a page that creates or
 * changes data (new purchase, edit sale…): in read-only mode it shows the
 * read-only notice instead. UI only: the server checks every request.
 */
export function RequirePermission({
  permission,
  write = false,
  children,
}: {
  permission: Permission;
  write?: boolean;
  children: ReactNode;
}) {
  if (!useCan(permission)) return <ForbiddenState />;
  return write ? <WriteGate>{children}</WriteGate> : children;
}
