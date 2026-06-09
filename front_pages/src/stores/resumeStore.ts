import { create } from "zustand";

type ResumeState = {
  currentResumeId?: string;
  setCurrentResumeId: (resumeId?: string) => void;
};

export const useResumeStore = create<ResumeState>((set) => ({
  currentResumeId: window.localStorage.getItem("recentResumeId") ?? undefined,
  setCurrentResumeId: (resumeId) => {
    if (resumeId) window.localStorage.setItem("recentResumeId", resumeId);
    set({ currentResumeId: resumeId });
  },
}));
