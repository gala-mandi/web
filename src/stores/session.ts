import { create } from "zustand";
import type { Session, User } from "@/features/auth/types";

interface SessionState {
  /** Kept in memory only, never in localStorage. */
  accessToken: string | null;
  /** The signed-in user (role and tenant included), from login or refresh. */
  user: User | null;
  setSession: (session: Pick<Session, "accessToken" | "user">) => void;
  setAccessToken: (token: string | null) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  accessToken: null,
  user: null,
  setSession: ({ accessToken, user }) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}));

export const selectRole = (state: SessionState) => state.user?.role ?? null;
export const selectTenant = (state: SessionState) => state.user?.tenant ?? null;
