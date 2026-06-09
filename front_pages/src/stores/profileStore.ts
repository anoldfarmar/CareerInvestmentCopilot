import { create } from "zustand";

import type { UserProfile } from "@/features/profile/types";

type ProfileState = {
  profile?: UserProfile;
  setProfile: (profile: UserProfile) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  profile: undefined,
  setProfile: (profile) => set({ profile }),
}));
