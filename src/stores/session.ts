import { create } from "zustand";

interface SessionState {
  /** Kept in memory only, never in localStorage. */
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null }),
}));
