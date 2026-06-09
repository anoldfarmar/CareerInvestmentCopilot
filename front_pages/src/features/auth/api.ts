import { http } from "@/services/http";

import type { AuthResponse, AuthUser, LoginValues, RegisterValues } from "./types";

export async function login(values: LoginValues): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>("/auth/login", values);
  return data;
}

export async function register(values: RegisterValues): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>("/auth/register", values);
  return data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await http.get<AuthUser>("/auth/me");
  return data;
}
