import { http } from "@/services/http";

import { mockProfile } from "./mock";
import type { UserProfile } from "./types";

// 个人偏好后端尚未接入，当前继续使用本地 Mock。
const useMock = true;
let profileStore = mockProfile;

export async function getProfile(): Promise<UserProfile> {
  if (!useMock) {
    const { data } = await http.get<UserProfile>("/profile");
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return profileStore;
}

export async function updateProfile(profile: UserProfile): Promise<UserProfile> {
  if (!useMock) {
    const { data } = await http.put<UserProfile>("/profile", profile);
    return data;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  profileStore = profile;
  return profileStore;
}
