"use client";

import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dataTableText as t } from "./text";

export interface DataTableRowActionsProps {
  /** Name of the row, for the button label "Actions for <name>". */
  rowName: string;
  /** `DropdownMenuItem`s (and separators) for this row. */
  children: ReactNode;
}

/** "…" menu for one row; put it in a column with `id: "actions"` and no label. */
export function DataTableRowActions({
  rowName,
  children,
}: DataTableRowActionsProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.rowActions(rowName)}
        >
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
