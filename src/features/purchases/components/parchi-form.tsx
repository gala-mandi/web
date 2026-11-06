"use client";

import { AlertCircle, Loader2, Plus, Printer } from "lucide-react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { FieldError } from "@/lib/api-error";
import { purchaseText } from "../text";

/** Pieces both parchi forms (purchase and sale) use. */

const t = purchaseText.form;

/** What happens after a successful save. */
export type SaveIntent = "save" | "print" | "new";

/**
 * Puts the server's field errors on their form fields (the first one gets
 * focus). Returns how many were placed and the messages no field shows.
 */
export function placeServerErrors<T extends FieldValues>(
  errors: readonly FieldError[],
  toFormField: (field: string) => string | null,
  setError: UseFormSetError<T>,
): { placed: number; unplaced: string[] } {
  const unplaced: string[] = [];
  let placed = 0;
  for (const { field, message } of errors) {
    const name = toFormField(field);
    if (!name) {
      if (message) unplaced.push(message);
      continue;
    }
    setError(
      name as Path<T>,
      { type: "server", message: message || purchaseText.errors.generic },
      { shouldFocus: placed === 0 },
    );
    placed += 1;
  }
  return { placed, unplaced };
}

/** The red box above the form for an error no field shows. */
export function FormErrorAlert({
  message,
  testId,
}: {
  message: string;
  testId: string;
}) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className="bg-destructive-soft border-destructive-border text-destructive flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
    >
      <AlertCircle aria-hidden className="mt-px size-4 flex-none" />
      {message}
    </div>
  );
}

/** Save (the form's submit button), Save & Print and, for a new bill, Save & New. */
export function SaveButtons({
  busy,
  showNew,
  onSubmit,
}: {
  busy: boolean;
  /** Save & New, for a new bill only. */
  showNew: boolean;
  onSubmit: (intent: Exclude<SaveIntent, "save">) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <Button
        type="submit"
        disabled={busy}
        className="h-11 gap-2 font-semibold"
      >
        {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
        {busy ? t.saving : t.save}
        <kbd aria-hidden className="ms-auto text-xs opacity-70">
          Ctrl S
        </kbd>
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        className="h-11 gap-2"
        onClick={() => onSubmit("print")}
      >
        <Printer aria-hidden />
        {t.saveAndPrint}
        <kbd aria-hidden className="text-muted-foreground ms-auto text-xs">
          Ctrl P
        </kbd>
      </Button>
      {showNew ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="h-11 gap-2"
          onClick={() => onSubmit("new")}
        >
          <Plus aria-hidden />
          {t.saveAndNew}
        </Button>
      ) : null}
    </div>
  );
}
