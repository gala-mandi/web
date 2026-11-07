const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
/** Starts or ends with punctuation or a symbol (no direction of its own). */
const NEUTRAL_EDGE = /^[^\p{L}\p{N}]|[^\p{L}\p{N}]$/u;

/**
 * A user-typed value (a name, a search) put into a sentence: isolated with
 * FSI…PDI when it could reorder its neighbours, e.g. "Al-Madina Rice Co."
 * inside Urdu text would otherwise show its full stop at the wrong end, and
 * an Urdu name inside English text would pull the words around it. Plain
 * one-script names are left as they are.
 */
export function bidi(value: string): string {
  if (!value) return value;
  return ARABIC_SCRIPT.test(value) || NEUTRAL_EDGE.test(value)
    ? `⁨${value}⁩`
    : value;
}
