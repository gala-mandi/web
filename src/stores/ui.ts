import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const UI_STORAGE_KEY = "gm-web-ui";

interface UiState {
  /** Desktop sidebar expanded (true) or collapsed to icons (false). */
  sidebarOpen: boolean;
  /** Ctrl+K command palette. Not persisted. */
  paletteOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
}

/**
 * Panel UI state (client state only). The sidebar choice is remembered in
 * localStorage, which is fine for a preference; tokens never go there.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      paletteOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
    }),
    {
      name: UI_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ sidebarOpen }) => ({ sidebarOpen }),
      // Read after mount (`PanelShell`), so server and client HTML match.
      skipHydration: true,
    },
  ),
);
