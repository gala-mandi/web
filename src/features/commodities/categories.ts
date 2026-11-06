import type { Translator } from "@/i18n/types";

/**
 * Categories every new shop starts with (the server's default list). Offered
 * as suggestions and in the list filter; the field itself is free text.
 */
export const suggestedCategories = [
  "grain",
  "pulse",
  "oilseed",
  "fibre",
  "vegetable",
] as const;

type SuggestedCategory = (typeof suggestedCategories)[number];

/** "grain" → "Grain" / "غلہ"; a shop's own category shows as typed. */
export function categoryLabel(
  t: Translator<"commodities">,
  category: string,
): string {
  const key = category.toLowerCase();
  return (suggestedCategories as readonly string[]).includes(key)
    ? t(`categories.${key as SuggestedCategory}`)
    : category;
}
