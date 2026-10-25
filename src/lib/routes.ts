/** Pages that never need a session (used by `proxy.ts` and the client). */
export const publicPaths = [
  "/",
  "/login",
  "/forgot-password",
  "/account-disabled",
  "/shop-suspended",
] as const;

export function isPublicPath(pathname: string): boolean {
  return (publicPaths as readonly string[]).includes(pathname);
}
