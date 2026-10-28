import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "@/lib/api-error";
import { inviteText, staffText } from "./text";

/** 409 codes the server may send without a field message. */
const conflictFields: Record<string, { field: string; message: string }> = {
  PHONE_TAKEN: { field: "phone", message: inviteText.errors.phoneTaken },
};

/**
 * Puts the server's field errors (`400`, `409 PHONE_TAKEN`) on the matching
 * form fields and focuses the first one. `rename` maps server field names to
 * form field names. Returns false when none of them belong to this form, so
 * the caller shows a general error instead.
 */
export function applyServerErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: readonly string[],
  rename: Record<string, string> = {},
): boolean {
  const conflict = error.code ? conflictFields[error.code] : undefined;
  const entries =
    error.errors.length > 0
      ? error.errors.map(({ field, message }) => ({
          field,
          message:
            (conflict && conflict.field === field ? conflict.message : "") ||
            message ||
            error.message ||
            staffText.errors.generic,
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
export function generalErrorMessage(error: ApiError): string {
  if (error.status === 0) return staffText.errors.network;
  return error.message ?? staffText.errors.generic;
}
