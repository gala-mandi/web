import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "@/lib/api-error";
import type { StaffTranslator } from "./schemas";

/** A 409 code and the field (and message) it belongs to. */
export type ConflictFields = Record<string, { field: string; message: string }>;

/**
 * Puts the server's field errors (`400`, `409 PHONE_TAKEN`) on the matching
 * form fields and focuses the first one. `rename` maps server field names to
 * form field names; `conflicts` maps 409 codes to their field and message;
 * `fallback` is shown for a field error without a message (all in the
 * interface language). Returns false when none of them belong to this form,
 * so the caller shows a general error instead.
 */
export function applyServerErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: readonly string[],
  {
    rename = {},
    conflicts = {},
    fallback,
  }: {
    rename?: Record<string, string>;
    conflicts?: ConflictFields;
    fallback: string;
  },
): boolean {
  const conflict = error.code ? conflicts[error.code] : undefined;
  const entries =
    error.errors.length > 0
      ? error.errors.map(({ field, message }) => ({
          field,
          message:
            (conflict && conflict.field === field ? conflict.message : "") ||
            message ||
            error.message ||
            fallback,
        }))
      : conflict
        ? [conflict]
        : [];

  let applied = 0;
  for (const entry of entries) {
    const field = rename[entry.field] ?? entry.field;
    if (!fields.includes(field)) continue;
    setError(
      field as Path<T>,
      { type: "server", message: entry.message },
      { shouldFocus: applied === 0 },
    );
    applied += 1;
  }
  return applied > 0;
}

/** Message for an error that isn't about one field. */
export function generalErrorMessage(
  error: ApiError,
  t: StaffTranslator,
): string {
  if (error.status === 0) return t("errors.network");
  return error.message ?? t("errors.generic");
}
