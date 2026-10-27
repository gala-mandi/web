/** Controls what `window.matchMedia` answers in tests (see vitest.setup.ts). */
export const media = { mobile: false };

export function matches(query: string): boolean {
  if (query.includes("max-width")) return media.mobile;
  return false;
}

export function resetMedia(): void {
  media.mobile = false;
}
