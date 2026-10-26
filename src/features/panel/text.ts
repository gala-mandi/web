import type { Role } from "@/features/auth/types";

export const panelText = {
  menuLabel: "Main menu",
  soon: "Soon",
  logout: "Log out",
  logoutAll: "Log out of all devices",
  logoutAllFailed: "Couldn’t log out of all devices. Try again.",
  roles: {
    super_admin: "Super admin",
    owner: "Owner",
    manager: "Manager",
    operator: "Operator",
  } satisfies Record<Role, string>,
  dashboard: {
    title: "Dashboard",
    welcome: (name: string) => `Welcome, ${name}`,
    body: "Your shop’s daily rates, purchases and sales will show here.",
    loading: "Loading…",
    error: "Couldn’t load your account. Check your internet and try again.",
    retry: "Try again",
  },
} as const;
