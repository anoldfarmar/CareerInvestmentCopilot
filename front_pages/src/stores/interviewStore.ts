import { create } from "zustand";

type InterviewState = {
  currentSessionId?: string;
  draftAnswer: string;
  recording: boolean;
  setCurrentSessionId: (sessionId?: string) => void;
  setDraftAnswer: (value: string) => void;
  setRecording: (recording: boolean) => void;
  resetInterviewDraft: () => void;
};

export const useInterviewStore = create<InterviewState>((set) => ({
  currentSessionId: undefined,
  draftAnswer: window.sessionStorage.getItem("draftAnswer") ?? "",
  recording: false,
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  setDraftAnswer: (draftAnswer) => {
    window.sessionStorage.setItem("draftAnswer", draftAnswer);
    set({ draftAnswer });
  },
  setRecording: (recording) => set({ recording }),
  resetInterviewDraft: () => {
    window.sessionStorage.removeItem("draftAnswer");
    set({ draftAnswer: "", recording: false });
  },
}));
