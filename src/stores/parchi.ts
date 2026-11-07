import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PaperSize, ParchiLanguage } from "@/features/parchi/types";

export const PARCHI_STORAGE_KEY = "gm-web-parchi";

interface ParchiPrefsState {
  /** The shop's printer paper; this browser remembers it. */
  paper: PaperSize;
  /**
   * The language picked on a parchi screen; null: the interface language.
   * Switching the interface language clears it, so prints follow the user.
   */
  lang: ParchiLanguage | null;
  setPaper: (paper: PaperSize) => void;
  setLang: (lang: ParchiLanguage | null) => void;
}

/**
 * The paper and language last used to print a parchi on this computer
 * (client state only: a preference, so localStorage is fine). Save &
 * Print and Reprint from the lists use the same choice.
 */
export const useParchiPrefs = create<ParchiPrefsState>()(
  persist(
    (set) => ({
      paper: "a4",
      lang: null,
      setPaper: (paper) => set({ paper }),
      setLang: (lang) => set({ lang }),
    }),
    {
      name: PARCHI_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ paper, lang }) => ({ paper, lang }),
      // Read after mount (`PanelShell`), so server and client HTML match.
      skipHydration: true,
    },
  ),
);
