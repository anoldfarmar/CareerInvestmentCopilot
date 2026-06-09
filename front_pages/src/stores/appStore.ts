import { create } from "zustand";

type AppState = {
  pageTitle: string;
  setPageTitle: (pageTitle: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  pageTitle: "AI求职助手",
  setPageTitle: (pageTitle) => set({ pageTitle }),
}));
