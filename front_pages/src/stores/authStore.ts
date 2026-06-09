import { create } from "zustand";

import type { AuthResponse, AuthUser } from "@/features/auth/types";

const storedUser = window.localStorage.getItem("authUser");

type AuthState = {
  token?: string;
  user?: AuthUser;
  setAuth: (response: AuthResponse) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: window.localStorage.getItem("token") ?? undefined,
  user: storedUser ? (JSON.parse(storedUser) as AuthUser) : undefined,
  setAuth: ({ accessToken, user }) => {
    window.localStorage.setItem("token", accessToken);
    window.localStorage.setItem("authUser", JSON.stringify(user));
    set({ token: accessToken, user });
  },
  logout: () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("authUser");
    set({ token: undefined, user: undefined });
  },
}));
